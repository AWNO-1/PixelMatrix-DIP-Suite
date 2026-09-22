import React, { useState, useRef } from 'react';
import { Upload, Sparkles, AlertCircle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { getPoseDetector, validateReferencePose } from '../lib/poseDetector';
import { drawPose } from '../lib/poseDrawing';

export default function ReferenceUpload({ onPoseExtracted, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [extractedPose, setExtractedPose] = useState(null);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const processImage = async (dataUri) => {
    setIsLoading(true);
    setValidationResult(null);
    setExtractedPose(null);
    setImageSrc(dataUri);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUri;
      });

      const detector = await getPoseDetector();
      const poses = await detector.estimatePoses(img);
      const validation = validateReferencePose(poses);
      setValidationResult(validation);

      if (validation.valid && validation.pose) {
        setExtractedPose(validation.pose);
        // رسم الهيكل العظمي فوق الصورة
        setTimeout(() => {
          if (canvasRef.current && img.naturalWidth && img.naturalHeight) {
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = img.naturalWidth;
            canvasRef.current.height = img.naturalHeight;
            drawPose(ctx, [validation.pose], img.naturalWidth, img.naturalHeight, true, true);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Pose extraction error:', err);
      setValidationResult({
        valid: false,
        reason: 'حدث خطأ أثناء تحليل الصورة: ' + err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يُرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      processImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        processImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSamplePose = () => {
    processImage('/test-pose.jpg');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-6 text-slate-100">
      <div className="max-w-3xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> PoseLook Core Phase
          </div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            رفع الصورة المرجعية للوضعية
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            ارفع صورة تحتوي على شخص بالوضعية التي ترغب في إعادة إنتاجها. سيقوم محرك الذكاء الاصطناعي باستخراج نقاط ومفاصل الجسم لمقارنتها لاحقاً مع الكاميرا الحية.
          </p>
        </div>

        {/* Upload Zone / Preview Area */}
        {!imageSrc ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-slate-900/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group"
          >
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-4 shadow-lg shadow-cyan-500/10">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-base font-medium text-slate-200">
              اسحب وأفلت صورتك المرجعية هنا، أو <span className="text-cyan-400 underline">تصفح ملفاتك</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">يدعم صور PNG, JPG, WEBP عالية الدقة</p>

            <div className="mt-6 pt-6 border-t border-slate-800/80 w-full flex flex-col items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSamplePose();
                }}
                className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                استخدام صورة نموذج جاهزة (تجربة فورية)
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Image Preview with Canvas Overlay */}
            <div className="relative w-full md:w-1/2 aspect-[3/4] max-h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Reference Pose"
                className="w-full h-full object-contain"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">جاري استخراج هيكل الجسم عبر BlazePose...</p>
                </div>
              )}
            </div>

            {/* Validation Details & Actions */}
            <div className="w-full md:w-1/2 flex flex-col justify-between self-stretch py-2">
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  نتيجة التحليل الرقمي:
                </h3>

                {validationResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      validationResult.valid
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {validationResult.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{validationResult.reason}</p>
                        {validationResult.valid && (
                          <div className="mt-2 text-xs text-emerald-400/80 space-y-1">
                            <p>• تم رصد {validationResult.validCount} مفصل بثقة عالية</p>
                            <p>• تم التحقق من توازي ووضوح الكتفين</p>
                            <p>• الوضعية جاهزة للمقارنة اللحظية بالكاميرا</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                {validationResult?.valid ? (
                  <button
                    onClick={() => onPoseExtracted(imageSrc, extractedPose)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <span>فتح الكاميرا وبدء المطابقة الحية</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setImageSrc(null);
                      setValidationResult(null);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
                  >
                    تجربة صورة أخرى
                  </button>
                )}

                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="text-xs text-slate-500 hover:text-slate-400 py-1 transition text-center"
                  >
                    العودة إلى محرر الصور
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
