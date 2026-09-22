import * as tf from '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgpu';
import '@tensorflow/tfjs-backend-webgl';

let detectorPromise = null;
let activeBackend = 'unknown';

/**
 * تهيئة نموذج BlazePose ومكتبة TensorFlow.js
 * يحاول WebGPU أولاً، وإذا لم يتوفر يستخدم WebGL كبديل تلقائي
 */
export async function getPoseDetector() {
  if (detectorPromise) {
    return detectorPromise;
  }

  detectorPromise = (async () => {
    try {
      // استخدام WebGL الموثوق به والمجرب مع نماذج BlazePose بدقة إحداثيات كاملة
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        activeBackend = 'webgl';
        console.log('[PoseLook] Initialized with WebGL backend');
      } catch (glErr) {
        console.warn('[PoseLook] WebGL failed, falling back to CPU:', glErr);
        await tf.setBackend('cpu');
        await tf.ready();
        activeBackend = 'cpu';
      }

      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      };

      const detector = await poseDetection.createDetector(model, detectorConfig);
      return detector;
    } catch (err) {
      detectorPromise = null;
      throw err;
    }
  })();

  return detectorPromise;
}

export function getActiveBackend() {
  return activeBackend;
}

/**
 * التحقق من صلاحية الوضعية المستخرجة من الصورة المرجعية
 */
export function validateReferencePose(poses) {
  if (!poses || poses.length === 0) {
    return {
      valid: false,
      reason: 'لم يتم العثور على أي شخص في الصورة. يُرجى استخدام صورة واضحة لشخص كامل أو نصف جسم.',
      pose: null,
    };
  }

  const pose = poses[0];
  const kpMap = new Map();
  for (const kp of pose.keypoints) {
    if (kp.name) kpMap.set(kp.name, kp);
  }

  // فحص الكتفين
  const ls = kpMap.get('left_shoulder');
  const rs = kpMap.get('right_shoulder');
  const shouldersVisible = (ls?.score || 0) >= 0.3 && (rs?.score || 0) >= 0.3;

  if (!shouldersVisible) {
    return {
      valid: false,
      reason: 'الكتفان غير واضحين في الصورة المرجعية. يُرجى رفع صورة يظهر فيها الجزء العلوي من الجسم بوضوح.',
      pose,
    };
  }

  // حساب عدد المفاصل الصالحة
  const validCount = pose.keypoints.filter((k) => (k.score || 0) >= 0.3).length;
  if (validCount < 6) {
    return {
      valid: false,
      reason: 'عدد مفاصل الجسم المرئية قليل جداً. يُرجى رفع صورة أوضح.',
      pose,
    };
  }

  return {
    valid: true,
    reason: 'تم استخراج وضعية الجسم بنجاح!',
    pose,
    validCount,
  };
}
