import React from 'react';
import { Sparkles, RotateCcw, Palette, Download, CheckCircle2 } from 'lucide-react';

export default function CapturePreview({
  capturedImageSrc,
  referenceImageSrc,
  score,
  onRetake,
  onProceedToEditor,
}) {
  const handleDownloadDirect = () => {
    const link = document.createElement('a');
    link.href = capturedImageSrc;
    link.download = `poselook-capture-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-6 text-slate-100">
      <div className="max-w-4xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        {/* Header Success Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">تم التقاط الوضعية بنجاح!</h2>
              <p className="text-xs text-slate-400">
                يمكنك الآن معاينة الصورة الملتقطة وإرسالها لمحرر PixelMatrix الرقمي لمعالجتها.
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">درجة التطابق المحققة:</span>
            <span className="text-xl font-black text-cyan-400">{score}%</span>
          </div>
        </div>

        {/* Comparison Preview (Side by Side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reference Pose */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">الوضعية المرجعية الأصلية:</span>
            <div className="aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={referenceImageSrc}
                alt="Target Reference"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Captured User Photo */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-cyan-400">صورتك الملتقطة:</span>
            <div className="aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-cyan-500/40 shadow-lg shadow-cyan-500/10 flex items-center justify-center">
              <img
                src={capturedImageSrc}
                alt="Captured Pose"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={onRetake}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة التقاط</span>
            </button>

            <button
              onClick={handleDownloadDirect}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl border border-slate-800 flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ كملف</span>
            </button>
          </div>

          <button
            onClick={onProceedToEditor}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Palette className="w-4 h-4" />
            <span>تحرير الصورة في PixelMatrix Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
