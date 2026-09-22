import { Pose } from '@tensorflow-models/pose-detection';

/**
 * خطوط الهيكل العظمي الأساسية
 */
const SKELETON_CONNECTIONS: [string, string][] = [
  // الرأس والكتفان
  ['left_ear', 'left_eye'],
  ['right_ear', 'right_eye'],
  ['left_eye', 'nose'],
  ['right_eye', 'nose'],
  ['left_shoulder', 'right_shoulder'],
  // الذراع اليسرى
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  // الذراع اليمنى
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // الجذع
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // الساق اليسرى
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  // الساق اليمنى
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

export function drawPose(
  ctx: CanvasRenderingContext2D,
  poses: Pose[],
  videoWidth: number,
  videoHeight: number,
  skipEarNoseEye: boolean = false,
  clearCanvas: boolean = true,
  minConfidence: number = 0.18
) {
  if (!poses || poses.length === 0) return;

  if (clearCanvas) {
    ctx.clearRect(0, 0, videoWidth, videoHeight);
  }

  const pose = poses[0];
  if (!pose || !pose.keypoints) return;

  const kpMap = new Map<string, { x: number; y: number; score?: number }>();
  for (const kp of pose.keypoints) {
    if (kp.name) kpMap.set(kp.name, kp);
  }

  ctx.save();

  // 1. رسم خطوط الهيكل العظمي بلون نيون جذاب وتوهج ناعم
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [startPoint, endPoint] of SKELETON_CONNECTIONS) {
    if (skipEarNoseEye && (startPoint.includes('eye') || startPoint.includes('ear') || endPoint.includes('eye') || endPoint.includes('ear'))) {
      continue;
    }

    const start = kpMap.get(startPoint);
    const end = kpMap.get(endPoint);

    if (
      start &&
      end &&
      (start.score ?? 0) >= minConfidence &&
      (end.score ?? 0) >= minConfidence
    ) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  // 2. رسم المفاصل كنقاط دائرية مضيئة وواضحة
  for (const kp of pose.keypoints) {
    if (!kp || (kp.score ?? 0) < minConfidence) continue;
    if (skipEarNoseEye && ['left_ear', 'right_ear', 'nose', 'left_eye', 'right_eye'].includes(kp.name ?? '')) {
      continue;
    }

    // دائرة خارجية متوهجة
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.fill();

    // نقطة داخلية ناصعة البياض
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fill();
  }

  ctx.restore();
}
