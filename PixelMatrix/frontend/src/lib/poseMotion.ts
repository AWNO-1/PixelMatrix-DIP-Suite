import { Pose, Keypoint } from '@tensorflow-models/pose-detection';

export interface KeyframePose {
  id: string;
  timestamp: number;
  dataUri: string;
  pose: Pose;
  imageElement?: HTMLImageElement;
}

export type BlendModeType = 'ghost' | 'clones' | 'trajectory_only';

export const TRACKABLE_JOINTS = [
  { id: 'right_wrist', label: 'المعصم الأيمن' },
  { id: 'left_wrist', label: 'المعصم الأيسر' },
  { id: 'right_ankle', label: 'القدم اليمنى' },
  { id: 'left_ankle', label: 'القدم اليسرى' },
  { id: 'nose', label: 'الرأس / الأنف' },
];

/**
 * حساب الإزاحة الكلية لمفاصل الجسم بين وضعيتين لتحديد الانتقال الحركي
 */
export function calculatePoseDisplacement(poseA: Pose, poseB: Pose): number {
  if (!poseA?.keypoints || !poseB?.keypoints) return 0;

  const mapA = new Map(poseA.keypoints.map((k) => [k.name, k]));
  const mapB = new Map(poseB.keypoints.map((k) => [k.name, k]));

  let totalDist = 0;
  let count = 0;

  const keyJoints = [
    'left_wrist',
    'right_wrist',
    'left_elbow',
    'right_elbow',
    'left_shoulder',
    'right_shoulder',
    'left_knee',
    'right_knee',
  ];

  for (const name of keyJoints) {
    const a = mapA.get(name);
    const b = mapB.get(name);
    if (a && b && (a.score ?? 0) >= 0.25 && (b.score ?? 0) >= 0.25) {
      totalDist += Math.hypot(a.x - b.x, a.y - b.y);
      count++;
    }
  }

  return count > 0 ? totalDist / count : 0;
}

/**
 * فحص استقرار وثبات الوضعية (لتشغيل الالتقاط التلقائي عند الثبات)
 */
export function isPoseHolding(poseHistory: Pose[], maxVariance: number = 10): boolean {
  if (poseHistory.length < 15) return false;

  const latest = poseHistory[poseHistory.length - 1];
  for (let i = poseHistory.length - 15; i < poseHistory.length - 1; i++) {
    const disp = calculatePoseDisplacement(latest, poseHistory[i]);
    if (disp > maxVariance) {
      return false;
    }
  }
  return true;
}

/**
 * رسم مسار الحركة النيوني المتوهج بين الوضعيات المتتابعة (Kinematic Motion Trajectory)
 */
export function drawMotionTrajectory(
  ctx: CanvasRenderingContext2D,
  keyframes: KeyframePose[],
  jointName: string = 'right_wrist',
  color: string = '#00f5ff'
) {
  if (keyframes.length < 2) return;

  const points: { x: number; y: number }[] = [];

  for (const kf of keyframes) {
    const kp = kf.pose.keypoints.find((k) => k.name === jointName);
    if (kp && (kp.score ?? 0) >= 0.2) {
      points.push({ x: kp.x, y: kp.y });
    }
  }

  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // رسم مسار ناعم
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const xc = (points[i - 1].x + points[i].x) / 2;
    const yc = (points[i - 1].y + points[i].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  // رسم مؤشرات دائرية متوهجة لكل محطة وضعية مع رقم المحطة
  points.forEach((pt, idx) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText(`${idx + 1}`, pt.x + 10, pt.y - 8);
  });

  ctx.restore();
}

/**
 * دمج طبقات الوضعيات المتعددة في كانفاس مركب عالي الدقة (Multi-Layer Chronophotography Compositor)
 */
export async function generateCompositeCanvas(
  keyframes: KeyframePose[],
  width: number,
  height: number,
  options: {
    blendMode: BlendModeType;
    showTrajectory: boolean;
    trajectoryJoint: string;
    opacityDecay?: boolean;
  }
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || keyframes.length === 0) return canvas;

  const loadedImages: HTMLImageElement[] = await Promise.all(
    keyframes.map((kf) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = kf.dataUri;
      });
    })
  );

  const total = loadedImages.length;

  if (options.blendMode === 'ghost') {
    // 1. نمط الأثر الحركي السينمائي (Ghosting Action Trail)
    ctx.globalAlpha = 1.0;
    ctx.drawImage(loadedImages[0], 0, 0, width, height);

    for (let i = 1; i < total; i++) {
      const progress = i / (total - 1 || 1);
      const alpha = 0.35 + progress * 0.5;
      ctx.globalAlpha = Math.min(0.9, alpha);
      ctx.drawImage(loadedImages[i], 0, 0, width, height);
    }
  } else if (options.blendMode === 'clones') {
    // 2. نمط استنساخ الشخص المتعدد (Equal Multi-Pose Clones)
    ctx.globalAlpha = 1.0;
    ctx.drawImage(loadedImages[0], 0, 0, width, height);

    for (let i = 1; i < total; i++) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(loadedImages[i], 0, 0, width, height);
    }
  } else {
    // 3. آخر إطار مع مسارات الحركة فقط
    ctx.globalAlpha = 1.0;
    ctx.drawImage(loadedImages[total - 1], 0, 0, width, height);
  }

  ctx.globalAlpha = 1.0;

  // رسم مسار الحركة الحركي المتوهج
  if (options.showTrajectory && keyframes.length >= 2) {
    drawMotionTrajectory(ctx, keyframes, options.trajectoryJoint, '#00f5ff');
  }

  return canvas;
}
