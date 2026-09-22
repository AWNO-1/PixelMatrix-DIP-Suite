import * as poseDetection from '@tensorflow-models/pose-detection';

/**
 * أسماء المفاصل الأساسية
 */
export const BODY_KEYPOINTS = [
  'left_shoulder',
  'left_elbow',
  'left_wrist',
  'left_hip',
  'left_knee',
  'left_ankle',
  'right_shoulder',
  'right_elbow',
  'right_wrist',
  'right_hip',
  'right_knee',
  'right_ankle',
];

/**
 * حساب المسافة الإقليدية بين نقطتين
 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * حساب الزاوية عند النقطة b بين القطعتين ab و bc بقانون جيب التمام
 * الناتج بالدرجات بين 0 و 180
 */
export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ac = distance(a, c);

  if (ab < 1e-4 || bc < 1e-4) return 0;

  let cosAngle = (ab * ab + bc * bc - ac * ac) / (2 * ab * bc);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * حساب زاوية ميلان المتجه بين نقطتين بالنسبة للمحور الأفقي (-180 إلى 180)
 */
function vectorAngle(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

/**
 * استخراج الزوايا الأساسية والمحاور للجسم
 * تدعم وضعيات الجسم الكاملة ونصف الجسم (Upper Body) لكاميرات اللابتوب
 */
export function extractJointAngles(
  pose: poseDetection.Pose,
  minConfidence: number = 0.2
): Record<string, number | null> {
  const kpMap = new Map<string, poseDetection.Keypoint>();
  for (const kp of pose.keypoints) {
    if (kp.name) kpMap.set(kp.name, kp);
  }

  const isValid = (kp: poseDetection.Keypoint | undefined): boolean => {
    return Boolean(kp && kp.score != null && kp.score >= minConfidence);
  };

  const getAngleIfValid = (
    aName: string,
    bName: string,
    cName: string
  ): number | null => {
    const a = kpMap.get(aName);
    const b = kpMap.get(bName);
    const c = kpMap.get(cName);
    if (isValid(a) && isValid(b) && isValid(c)) {
      return calculateAngle(a!, b!, c!);
    }
    return null;
  };

  const angles: Record<string, number | null> = {};

  // 1. زوايا الكوعين (Elbows)
  angles.leftElbow = getAngleIfValid('left_shoulder', 'left_elbow', 'left_wrist');
  angles.rightElbow = getAngleIfValid('right_shoulder', 'right_elbow', 'right_wrist');

  // 2. زوايا الكتفين بالنسبة للجذع (Shoulders to Torso) - عند توفر الورك
  angles.leftShoulder = getAngleIfValid('left_elbow', 'left_shoulder', 'left_hip');
  angles.rightShoulder = getAngleIfValid('right_elbow', 'right_shoulder', 'right_hip');

  // 3. زوايا امتداد الذراعين بالنسبة للكتفين (Upper Body Arm Span)
  // تعمل حتى إذا كان النصف السفلي من الجسم غير مرئي في كاميرا اللابتوب
  angles.leftArmSpan = getAngleIfValid('left_elbow', 'left_shoulder', 'right_shoulder');
  angles.rightArmSpan = getAngleIfValid('right_elbow', 'right_shoulder', 'left_shoulder');

  // 4. زوايا الوركين والركبتين إن كانت مرئية (الجسم الكامل)
  angles.leftHip = getAngleIfValid('left_shoulder', 'left_hip', 'left_knee');
  angles.rightHip = getAngleIfValid('right_shoulder', 'right_hip', 'right_knee');
  angles.leftKnee = getAngleIfValid('left_hip', 'left_knee', 'left_ankle');
  angles.rightKnee = getAngleIfValid('right_hip', 'right_knee', 'right_ankle');

  // 5. زاوية ميل الكتفين (Shoulder Slope)
  const ls = kpMap.get('left_shoulder');
  const rs = kpMap.get('right_shoulder');
  if (isValid(ls) && isValid(rs)) {
    angles.shoulderSlope = vectorAngle(ls!, rs!);
  } else {
    angles.shoulderSlope = null;
  }

  // 6. اتجاه الساعد الأيسر والأيمن (Arm Orientations)
  const le = kpMap.get('left_elbow');
  const lw = kpMap.get('left_wrist');
  if (isValid(le) && isValid(lw)) {
    angles.leftForearm = vectorAngle(le!, lw!);
  } else {
    angles.leftForearm = null;
  }

  const re = kpMap.get('right_elbow');
  const rw = kpMap.get('right_wrist');
  if (isValid(re) && isValid(rw)) {
    angles.rightForearm = vectorAngle(re!, rw!);
  } else {
    angles.rightForearm = null;
  }

  return angles;
}

export interface PoseSimilarityResult {
  score: number;
  validPairsCount: number;
  averageDiff: number;
  details: Record<string, { ref: number | null; live: number | null; diff: number | null }>;
}

/**
 * حساب درجة التطابق بين وضعية مرجعية ووضعية حية
 */
export function calculatePoseSimilarity(
  refPose: poseDetection.Pose,
  livePose: poseDetection.Pose,
  minValidPairs: number = 1
): PoseSimilarityResult {
  if (!refPose || !livePose || !refPose.keypoints || !livePose.keypoints) {
    return { score: 0, validPairsCount: 0, averageDiff: 180, details: {} };
  }

  const refAngles = extractJointAngles(refPose, 0.2);
  const liveAngles = extractJointAngles(livePose, 0.2);

  let totalDiff = 0;
  let validPairsCount = 0;
  const details: Record<string, { ref: number | null; live: number | null; diff: number | null }> = {};

  const allKeys = Object.keys(refAngles);

  for (const key of allKeys) {
    const r = refAngles[key];
    const l = liveAngles[key];

    if (r !== null && l !== null && !isNaN(r) && !isNaN(l)) {
      // حساب أصغر فرق زاوي دائري (Circular difference)
      let diff = Math.abs(r - l);
      if (key.includes('Slope') || key.includes('Forearm')) {
        // فرق زوايا متجهات (-180..180)
        diff = diff > 180 ? 360 - diff : diff;
      }

      totalDiff += diff;
      validPairsCount++;
      details[key] = { ref: Math.round(r), live: Math.round(l), diff: Math.round(diff) };
    } else {
      details[key] = { ref: r !== null ? Math.round(r) : null, live: l !== null ? Math.round(l) : null, diff: null };
    }
  }

  // إذا لم نجد أزواج زوايا كافية، نقوم بعمل fallback على تماثل متجهات الكتفين والكوعين
  if (validPairsCount < minValidPairs) {
    // محاولة حساب تقارب عام بين النقاط الأساسية المرئية
    const refKpMap = new Map(refPose.keypoints.map(k => [k.name, k]));
    const liveKpMap = new Map(livePose.keypoints.map(k => [k.name, k]));

    let visiblePoints = 0;
    for (const name of BODY_KEYPOINTS) {
      const r = refKpMap.get(name);
      const l = liveKpMap.get(name);
      if (r && l && (r.score ?? 0) >= 0.2 && (l.score ?? 0) >= 0.2) {
        visiblePoints++;
      }
    }

    if (visiblePoints >= 3) {
      // يوجد تواجد بشري مرئي ولكن الزوايا بحاجة لضبط الوضعية
      return {
        score: Math.min(45, Math.round((visiblePoints / 12) * 45)),
        validPairsCount: visiblePoints,
        averageDiff: 120,
        details,
      };
    }

    return {
      score: 0,
      validPairsCount: 0,
      averageDiff: 180,
      details,
    };
  }

  const averageDiff = totalDiff / validPairsCount;
  // تحويل الفرق الزاوي (0-180) إلى درجة مئوية (0-100) مع منحنى تقارب مرن
  const similarityRatio = Math.max(0, 1 - averageDiff / 140);
  const score = Math.round(Math.pow(similarityRatio, 1.2) * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    validPairsCount,
    averageDiff: Math.round(averageDiff * 10) / 10,
    details,
  };
}
