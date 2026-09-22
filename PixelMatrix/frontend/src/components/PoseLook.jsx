import React, { useState } from 'react';
import ReferenceUpload from './ReferenceUpload';
import PoseCamera from './PoseCamera';
import CapturePreview from './CapturePreview';

/**
 * المكون الرئيسي لمنظومة PoseLook
 * يدير التدفق المتسلسل:
 * 1. رفع الصورة المرجعية واستخراج وضعية الجسم (ReferenceUpload)
 * 2. فتح الكاميرا الحية والمطابقة اللحظية Side-by-Side والالتقاط (PoseCamera)
 * 3. معاينة الصورة الملتقطة وخيارات الإعادة أو التحرير (CapturePreview)
 * 4. نقل الصورة مباشرة إلى محرر PixelMatrix عبر onComplete(dataUri)
 */
export default function PoseLook({ onComplete, onExit }) {
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload' | 'camera' | 'preview'
  const [referenceImageSrc, setReferenceImageSrc] = useState(null);
  const [referencePose, setReferencePose] = useState(null);
  const [capturedImageSrc, setCapturedImageSrc] = useState(null);
  const [capturedScore, setCapturedScore] = useState(0);

  // عند نجاح استخراج وضعية المرجع -> الانتقال للكاميرا
  const handlePoseExtracted = (imgSrc, pose) => {
    setReferenceImageSrc(imgSrc);
    setReferencePose(pose);
    setCurrentStep('camera');
  };

  // عند التقاط الصورة من الكاميرا -> الانتقال للمعاينة
  const handleCapture = (capturedDataUri, score) => {
    setCapturedImageSrc(capturedDataUri);
    setCapturedScore(score);
    setCurrentStep('preview');
  };

  // إعادة الالتقاط
  const handleRetake = () => {
    setCapturedImageSrc(null);
    setCurrentStep('camera');
  };

  // العودة لتغيير الصورة المرجعية
  const handleBackToUpload = () => {
    setCurrentStep('upload');
  };

  // إرسال الصورة لمحرر PixelMatrix
  const handleProceedToEditor = () => {
    if (capturedImageSrc) {
      onComplete(capturedImageSrc);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-center relative overflow-y-auto">
      {currentStep === 'upload' && (
        <ReferenceUpload
          onPoseExtracted={handlePoseExtracted}
          onCancel={onExit}
        />
      )}

      {currentStep === 'camera' && (
        <PoseCamera
          referenceImageSrc={referenceImageSrc}
          referencePose={referencePose}
          onCapture={handleCapture}
          onBack={handleBackToUpload}
        />
      )}

      {currentStep === 'preview' && (
        <CapturePreview
          capturedImageSrc={capturedImageSrc}
          referenceImageSrc={referenceImageSrc}
          score={capturedScore}
          onRetake={handleRetake}
          onProceedToEditor={handleProceedToEditor}
        />
      )}
    </div>
  );
}
