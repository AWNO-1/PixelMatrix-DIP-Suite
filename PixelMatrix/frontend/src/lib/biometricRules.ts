import { Pose } from '@tensorflow-models/pose-detection';

export interface BiometricCheckItem {
  id: string;
  name: string;
  passed: boolean;
  value: string;
  target: string;
}

export interface BiometricValidationResult {
  compliant: boolean;
  complianceScore: number;
  checks: {
    shoulderLevel: BiometricCheckItem;
    headTilt: BiometricCheckItem;
    headSize: BiometricCheckItem;
    centered: BiometricCheckItem;
  };
  shoulderSlopeDeg: number;
  headTiltDeg: number;
  headRatioPercent: number;
}

export interface PassportPreset {
  id: string;
  name: string;
  ratio: number; // width / height
  widthMm: number;
  heightMm: number;
  description: string;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: 'schengen',
    name: 'جواز السفر الأوروبي والعربي (Schengen / Arab)',
    ratio: 35 / 45,
    widthMm: 35,
    heightMm: 45,
    description: 'المقاس القياسي للجوازات الدولية (35 × 45 ملم)',
  },
  {
    id: 'us_visa',
    name: 'التأشيرة الأمريكية (US Visa / Green Card)',
    ratio: 1.0,
    widthMm: 51,
    heightMm: 51,
    description: 'المقاس القياسي للفيزا واللوتري الأمريكي (2 × 2 بوصة)',
  },
  {
    id: 'national_id',
    name: 'بطاقة الهوية الوطنية (National ID)',
    ratio: 40 / 50,
    widthMm: 40,
    heightMm: 50,
    description: 'المقاس المعتمد للبطاقات الرسمية (40 × 50 ملم)',
  },
];

/**
 * فحص مطابقة وضعية الشخص للمعايير البيومترية الرسمية الدولية (ICAO Doc 9303)
 */
export function validateBiometrics(
  pose: Pose,
  frameWidth: number,
  frameHeight: number
): BiometricValidationResult {
  if (!pose || !pose.keypoints) {
    return {
      compliant: false,
      complianceScore: 0,
      checks: {
        shoulderLevel: { id: 'shoulder', name: 'توازي واستقامة الكتفين', passed: false, value: '--', target: '±5.0°' },
        headTilt: { id: 'headTilt', name: 'استقامة محور الرأس والأنف', passed: false, value: '--', target: '±6.5°' },
        headSize: { id: 'headSize', name: 'المسافة وحجم الرأس البيومتري', passed: false, value: '--', target: '35% - 75%' },
        centered: { id: 'centered', name: 'تموضع الشخص في منتصف الكادر', passed: false, value: '--', target: '40% - 60%' },
      },
      shoulderSlopeDeg: 0,
      headTiltDeg: 0,
      headRatioPercent: 0,
    };
  }

  const kpMap = new Map(pose.keypoints.map((k) => [k.name, k]));
  const ls = kpMap.get('left_shoulder');
  const rs = kpMap.get('right_shoulder');
  const nose = kpMap.get('nose');
  const le = kpMap.get('left_eye');
  const re = kpMap.get('right_eye');

  const validKeypoints = Boolean(
    ls && rs && nose &&
    (ls.score ?? 0) >= 0.25 &&
    (rs.score ?? 0) >= 0.25 &&
    (nose.score ?? 0) >= 0.25
  );

  if (!validKeypoints) {
    return {
      compliant: false,
      complianceScore: 10,
      checks: {
        shoulderLevel: { id: 'shoulder', name: 'توازي واستقامة الكتفين', passed: false, value: 'غير واضح', target: '±5.0°' },
        headTilt: { id: 'headTilt', name: 'استقامة محور الرأس والأنف', passed: false, value: 'غير واضح', target: '±6.5°' },
        headSize: { id: 'headSize', name: 'المسافة وحجم الرأس البيومتري', passed: false, value: 'غير واضح', target: '35% - 75%' },
        centered: { id: 'centered', name: 'تموضع الشخص في منتصف الكادر', passed: false, value: 'غير واضح', target: '40% - 60%' },
      },
      shoulderSlopeDeg: 0,
      headTiltDeg: 0,
      headRatioPercent: 0,
    };
  }

  // 1. حساب زاوية ميل الكتفين (Shoulder Leveling)
  // في الكاميرا، الفرق الرأسي بين الكتف الأيمن والأيسر
  const dy = (rs!.y - ls!.y);
  const dx = (rs!.x - ls!.x);
  const rawShoulderSlope = Math.atan2(dy, dx) * (180 / Math.PI);
  // تطبيع الزاوية حول الصفر
  let shoulderSlopeDeg = Math.abs(rawShoulderSlope);
  if (shoulderSlopeDeg > 90) shoulderSlopeDeg = Math.abs(180 - shoulderSlopeDeg);
  const shoulderPassed = shoulderSlopeDeg <= 5.0;

  // 2. حساب استقامة محور الرأس والأنف مقارنة بمنتصف الكتفين (Head Tilt)
  const shoulderMidX = (ls!.x + rs!.x) / 2;
  const shoulderMidY = (ls!.y + rs!.y) / 2;
  const headVecX = nose!.x - shoulderMidX;
  const headVecY = nose!.y - shoulderMidY;
  // زاوية المحور الرأسي (المثالي أن تكون قريبة من -90 درجة رأسياً)
  const headAngle = Math.atan2(headVecY, headVecX) * (180 / Math.PI);
  const headTiltDeg = Math.round(Math.abs(headAngle + 90) * 10) / 10;
  const headTiltPassed = headTiltDeg <= 6.5;

  // 3. النسبة البيومترية لحجم الرأس في الكادر (Head to Frame Ratio)
  // معيار ICAO: يشغل الرأس من الذقن إلى أعلى الرأس بين 40% و 75% من ارتفاع الصورة
  const shoulderDist = Math.hypot(dx, dy);
  const estimatedHeadHeight = Math.max(shoulderDist * 0.75, Math.abs(shoulderMidY - nose!.y) * 1.8);
  const headRatioPercent = Math.round((estimatedHeadHeight / frameHeight) * 100);
  const headSizePassed = headRatioPercent >= 30 && headRatioPercent <= 85;

  // 4. التموضع في منتصف الكادر (Centering)
  const nosePercentX = Math.round((nose!.x / frameWidth) * 100);
  const centeredPassed = nosePercentX >= 35 && nosePercentX <= 65;

  const passedCount = [shoulderPassed, headTiltPassed, headSizePassed, centeredPassed].filter(Boolean).length;
  const complianceScore = Math.round((passedCount / 4) * 100);
  const compliant = passedCount === 4;

  return {
    compliant,
    complianceScore,
    checks: {
      shoulderLevel: {
        id: 'shoulder',
        name: 'توازي واستقامة الكتفين',
        passed: shoulderPassed,
        value: `${shoulderSlopeDeg.toFixed(1)}°`,
        target: '±5.0°',
      },
      headTilt: {
        id: 'headTilt',
        name: 'استقامة محور الرأس والأنف',
        passed: headTiltPassed,
        value: `${headTiltDeg}°`,
        target: '±6.5°',
      },
      headSize: {
        id: 'headSize',
        name: 'المسافة وحجم الرأس البيومتري',
        passed: headSizePassed,
        value: `${headRatioPercent}%`,
        target: '35% - 75%',
      },
      centered: {
        id: 'centered',
        name: 'تموضع الشخص في منتصف الكادر',
        passed: centeredPassed,
        value: `${nosePercentX}%`,
        target: '40% - 60%',
      },
    },
    shoulderSlopeDeg: Math.round(shoulderSlopeDeg * 10) / 10,
    headTiltDeg,
    headRatioPercent,
  };
}

/**
 * توليد ورقة طباعة رسمية بمقاس 4×6 بوصة تحتوي على 6 صور مصفوفة مع خطوط القص (Print Sheet Generator)
 */
export async function generatePrintSheet(
  photoDataUri: string,
  options: {
    sheetWidth?: number;
    sheetHeight?: number;
    count?: number;
    bgColor?: string;
  } = {}
): Promise<string> {
  const sheetW = options.sheetWidth || 1800; // دقة طباعة 300 DPI لـ 6 بوصة
  const sheetH = options.sheetHeight || 1200; // دقة طباعة 300 DPI لـ 4 بوصة

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return photoDataUri;

  // خلفية بيضاء نقية للورقة
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  // تحميل الصورة الفردية
  const img = new Image();
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    img.src = photoDataUri;
  });

  // تخطيط شبكة 2 صفوف × 3 أعمدة (6 صور)
  const cols = 3;
  const rows = 2;
  const photoW = 460;
  const photoH = 540;

  const totalGridW = cols * photoW;
  const totalGridH = rows * photoH;
  const startX = (sheetW - totalGridW) / 2;
  const startY = (sheetH - totalGridH) / 2;

  ctx.strokeStyle = '#cbd5e1'; // خطوط قص رمادية رفيعة
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]); // خط مقطع للدلالة على القص بالمقص

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * photoW;
      const y = startY + r * photoH;

      // رسم الصورة
      ctx.drawImage(img, x, y, photoW, photoH);

      // رسم إطار القص الرفيع
      ctx.strokeRect(x, y, photoW, photoH);
    }
  }

  // طباعة بيانات الاستوديو والمقاس في الهامش السفلي
  ctx.setLineDash([]);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('PixelMatrix • Smart Biometric Passport Print Sheet (4×6" Photo Paper | 6 Copies)', startX, sheetH - 40);

  return canvas.toDataURL('image/jpeg', 0.98);
}
