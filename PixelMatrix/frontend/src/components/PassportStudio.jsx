import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  FileCheck,
  Download,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  UserCheck,
  Upload
} from 'lucide-react';
import { getPoseDetector } from '../lib/poseDetector';
import { drawPose } from '../lib/poseDrawing';
import {
  validateBiometrics,
  generatePrintSheet,
  PASSPORT_PRESETS
} from '../lib/biometricRules';

export default function PassportStudio({ onComplete, onExit, initialPreset = 'schengen' }) {
  const videoRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const hudCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const compliantTimerRef = useRef(null);
  const currentLivePoseRef = useRef(null);
  const uploadInputRef = useRef(null);

  // States
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [biometrics, setBiometrics] = useState(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const [activePreset, setActivePreset] = useState(initialPreset || 'schengen');
  const [bgColor, setBgColor] = useState('white'); // 'white' | 'blue' | 'gray' | 'original'
  const [outputMode, setOutputMode] = useState('sheet'); // 'sheet' (6 photos) | 'single'
  const [processedResultUri, setProcessedResultUri] = useState(null);
  const [autoCountdown, setAutoCountdown] = useState(null); // null | 3 | 2 | 1
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (initialPreset) setActivePreset(initialPreset);
  }, [initialPreset]);

  // رفع صورة شخصية من الجهاز لفحصها
  const handleUploadUserPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhotoUri(event.target.result);
      setProcessedResultUri(null);
    };
    reader.readAsDataURL(file);
  };

  // تشغيل الكاميرا
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          const onVideoReady = () => {
            if (isMounted) {
              video.play().catch(() => {});
              setIsCameraReady(true);
            }
          };
          video.onloadedmetadata = onVideoReady;
          video.onloadeddata = onVideoReady;
          video.oncanplay = onVideoReady;
          video.play().then(onVideoReady).catch(() => {});
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (isMounted) {
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'تم رفض إذن الكاميرا. يُرجى السماح بالوصول للكاميرا ثم إعادة المحاولة.'
              : 'تعذر تشغيل الكاميرا: ' + err.message
          );
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // التقاط الصورة يدوياً أو آلياً
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // وميض فلاش سينمائي
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = w;
    captureCanvas.height = h;
    const cCtx = captureCanvas.getContext('2d');

    // رسم صورة الفيديو مطابقة لما يراه المستخدم على الشاشة (Mirrored Selfie View)
    cCtx.translate(w, 0);
    cCtx.scale(-1, 1);
    cCtx.drawImage(video, 0, 0, w, h);

    const rawDataUri = captureCanvas.toDataURL('image/jpeg', 0.98);
    setCapturedPhotoUri(rawDataUri);
    setAutoCountdown(null);
  }, []);

  // حلقة رصد المعايير البيومترية اللحظية (Biometric Pose Loop)
  useEffect(() => {
    if (!isCameraReady || capturedPhotoUri) return;

    let detector = null;
    let isRunning = true;
    let isProcessing = false;

    async function initAndLoop() {
      try {
        detector = await getPoseDetector();
      } catch (e) {
        console.error('Pose detector init error:', e);
        return;
      }

      async function detectFrame() {
        if (!isRunning) return;

        const video = videoRef.current;
        const liveCanvas = liveCanvasRef.current;
        const hudCanvas = hudCanvasRef.current;

        if (
          video &&
          liveCanvas &&
          detector &&
          !isProcessing &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          isProcessing = true;
          try {
            if (!offscreenCanvasRef.current) {
              offscreenCanvasRef.current = document.createElement('canvas');
            }
            const offCanvas = offscreenCanvasRef.current;
            if (offCanvas.width !== video.videoWidth) {
              offCanvas.width = video.videoWidth;
            }
            if (offCanvas.height !== video.videoHeight) {
              offCanvas.height = video.videoHeight;
            }
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            offCtx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);

            const poses = await detector.estimatePoses(offCanvas, {
              flipHorizontal: false,
              maxPoses: 1,
            });

            if (liveCanvas.width !== video.videoWidth) {
              liveCanvas.width = video.videoWidth;
            }
            if (liveCanvas.height !== video.videoHeight) {
              liveCanvas.height = video.videoHeight;
            }
            if (hudCanvas && hudCanvas.width !== video.videoWidth) {
              hudCanvas.width = video.videoWidth;
              hudCanvas.height = video.videoHeight;
            }

            const ctx = liveCanvas.getContext('2d');
            const hudCtx = hudCanvas ? hudCanvas.getContext('2d') : null;

            if (poses && poses.length > 0) {
              const livePose = poses[0];
              currentLivePoseRef.current = livePose;

              // رسم هيكل الكتفين والرأس
              drawPose(ctx, poses, liveCanvas.width, liveCanvas.height, true, true, 0.2);

              // فحص المعايير البيومترية
              const validation = validateBiometrics(livePose, liveCanvas.width, liveCanvas.height);
              setBiometrics(validation);

              // رسم خطوط الإرشاد البيومترية على الـ HUD
              if (hudCtx) {
                hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
                const isOk = validation.compliant;
                const lineColor = isOk ? '#10b981' : '#f59e0b';

                hudCtx.save();
                hudCtx.strokeStyle = lineColor;
                hudCtx.lineWidth = isOk ? 3 : 2;
                hudCtx.shadowColor = lineColor;
                hudCtx.shadowBlur = isOk ? 10 : 4;
                hudCtx.setLineDash([8, 6]);

                // 1. إطار الرأس البيومتري (Head Oval)
                hudCtx.beginPath();
                hudCtx.ellipse(
                  hudCanvas.width / 2,
                  hudCanvas.height * 0.42,
                  hudCanvas.width * 0.22,
                  hudCanvas.height * 0.32,
                  0,
                  0,
                  Math.PI * 2
                );
                hudCtx.stroke();

                // 2. خط أفق توازي الكتفين (Shoulder Level Line)
                hudCtx.beginPath();
                hudCtx.moveTo(hudCanvas.width * 0.15, hudCanvas.height * 0.75);
                hudCtx.lineTo(hudCanvas.width * 0.85, hudCanvas.height * 0.75);
                hudCtx.stroke();

                // 3. خط التناظر الرأسي المركزي (Central Axis)
                hudCtx.setLineDash([4, 4]);
                hudCtx.beginPath();
                hudCtx.moveTo(hudCanvas.width / 2, hudCanvas.height * 0.08);
                hudCtx.lineTo(hudCanvas.width / 2, hudCanvas.height * 0.92);
                hudCtx.stroke();

                hudCtx.restore();
              }

              // التحقق من الاستيفاء التلقائي (Auto Capture on Compliance)
              if (validation.compliant) {
                if (!compliantTimerRef.current) {
                  compliantTimerRef.current = setTimeout(() => {
                    handleCapture();
                    compliantTimerRef.current = null;
                  }, 1200);
                }
              } else {
                if (compliantTimerRef.current) {
                  clearTimeout(compliantTimerRef.current);
                  compliantTimerRef.current = null;
                }
              }
            } else {
              ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
              if (hudCtx) hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
              setBiometrics(null);
            }
          } catch (err) {
            console.warn('[PassportStudio] Loop error:', err);
          } finally {
            isProcessing = false;
          }
        }

        if (isRunning) {
          animationFrameIdRef.current = requestAnimationFrame(detectFrame);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectFrame);
    }

    initAndLoop();

    return () => {
      isRunning = false;
      if (compliantTimerRef.current) {
        clearTimeout(compliantTimerRef.current);
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isCameraReady, capturedPhotoUri, handleCapture]);

  // معالجة الصورة الملتقطة: القص التلقائي، تغيير لون الخلفية، وشبكة الطباعة
  useEffect(() => {
    if (!capturedPhotoUri) {
      setProcessedResultUri(null);
      return;
    }

    let isCancelled = false;

    async function processPassportPhoto() {
      const preset = PASSPORT_PRESETS.find((p) => p.id === activePreset) || PASSPORT_PRESETS[0];

      // 1. قص وتأطير الصورة بحسب المقاس القياسي
      const tempImg = new Image();
      await new Promise((resolve) => {
        tempImg.onload = resolve;
        tempImg.onerror = resolve;
        tempImg.src = capturedPhotoUri;
      });

      const singleCanvas = document.createElement('canvas');
      const targetW = 600;
      const targetH = Math.round(targetW / preset.ratio);
      singleCanvas.width = targetW;
      singleCanvas.height = targetH;
      const sCtx = singleCanvas.getContext('2d');

      // تطبيق لون الخلفية المختار
      if (bgColor === 'white') {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, targetW, targetH);
      } else if (bgColor === 'blue') {
        sCtx.fillStyle = '#1d4ed8'; // أزرق رسمي ملكي
        sCtx.fillRect(0, 0, targetW, targetH);
      } else if (bgColor === 'gray') {
        sCtx.fillStyle = '#f1f5f9';
        sCtx.fillRect(0, 0, targetW, targetH);
      }

      // رسم صورة الشخص في المنتصف مع حماية أبعاد الرأس البيومترية
      // اقتصاص متمركز (Center Crop)
      const srcRatio = tempImg.naturalWidth / tempImg.naturalHeight;
      let sWidth = tempImg.naturalWidth;
      let sHeight = tempImg.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (srcRatio > preset.ratio) {
        sWidth = tempImg.naturalHeight * preset.ratio;
        sx = (tempImg.naturalWidth - sWidth) / 2;
      } else {
        sHeight = tempImg.naturalWidth / preset.ratio;
        sy = (tempImg.naturalHeight - sHeight) / 2;
      }

      sCtx.drawImage(tempImg, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

      const singlePhotoUri = singleCanvas.toDataURL('image/jpeg', 0.98);

      if (isCancelled) return;

      // 2. فحص نمط المخرجات: صورة فردية أو كرت طباعة 4x6 بوصة بـ 6 صور
      if (outputMode === 'sheet') {
        const sheetUri = await generatePrintSheet(singlePhotoUri, { count: 6 });
        if (!isCancelled) {
          setProcessedResultUri(sheetUri);
        }
      } else {
        setProcessedResultUri(singlePhotoUri);
      }
    }

    processPassportPhoto();

    return () => {
      isCancelled = true;
    };
  }, [capturedPhotoUri, activePreset, bgColor, outputMode]);

  // نموذج فوري جاهز للتجربة والعرض (Demo Biometric Shot)
  const handleLoadDemoBiometric = useCallback(() => {
    const preset = PASSPORT_PRESETS.find((p) => p.id === activePreset) || PASSPORT_PRESETS[0];
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 600;
    demoCanvas.height = Math.round(600 / preset.ratio);
    const dCtx = demoCanvas.getContext('2d');
    const w = demoCanvas.width;
    const h = demoCanvas.height;

    // خلفية استوديو بيضاء
    dCtx.fillStyle = '#ffffff';
    dCtx.fillRect(0, 0, w, h);

    // بدلة داكنة متوازية الأكتاف
    dCtx.fillStyle = '#0f172a';
    dCtx.beginPath();
    dCtx.ellipse(w * 0.50, h * 0.88, w * 0.38, h * 0.24, 0, 0, Math.PI * 2);
    dCtx.fill();

    // قميص رسمي وياقة
    dCtx.fillStyle = '#f8fafc';
    dCtx.beginPath();
    dCtx.moveTo(w * 0.45, h * 0.68);
    dCtx.lineTo(w * 0.50, h * 0.77);
    dCtx.lineTo(w * 0.55, h * 0.68);
    dCtx.fill();

    // ربطة عنق زرقاء
    dCtx.fillStyle = '#1e3a8a';
    dCtx.beginPath();
    dCtx.moveTo(w * 0.48, h * 0.70);
    dCtx.lineTo(w * 0.52, h * 0.70);
    dCtx.lineTo(w * 0.53, h * 0.88);
    dCtx.lineTo(w * 0.47, h * 0.88);
    dCtx.fill();

    // الرقبة
    dCtx.fillStyle = '#e2b392';
    dCtx.fillRect(w * 0.44, h * 0.56, w * 0.12, h * 0.14);

    // الرأس والوجه المتماثل
    dCtx.fillStyle = '#e2b392';
    dCtx.beginPath();
    dCtx.ellipse(w * 0.50, h * 0.42, w * 0.19, h * 0.18, 0, 0, Math.PI * 2);
    dCtx.fill();

    // الشعر الرسمي
    dCtx.fillStyle = '#1e293b';
    dCtx.beginPath();
    dCtx.arc(w * 0.50, h * 0.37, w * 0.20, Math.PI, Math.PI * 2);
    dCtx.fill();

    // الأعين والأنف والفم
    dCtx.fillStyle = '#0f172a';
    dCtx.beginPath();
    dCtx.arc(w * 0.44, h * 0.41, 7, 0, Math.PI * 2);
    dCtx.arc(w * 0.56, h * 0.41, 7, 0, Math.PI * 2);
    dCtx.fill();

    // ابتسامة خفيفة محايدة رسمية
    dCtx.strokeStyle = '#991b1b';
    dCtx.lineWidth = 3;
    dCtx.beginPath();
    dCtx.moveTo(w * 0.46, h * 0.51);
    dCtx.lineTo(w * 0.54, h * 0.51);
    dCtx.stroke();

    const uri = demoCanvas.toDataURL('image/jpeg', 0.98);
    setCapturedPhotoUri(uri);
  }, [activePreset]);

  // إعادة الالتقاط
  const handleRetake = () => {
    setCapturedPhotoUri(null);
    setProcessedResultUri(null);
  };

  // إرسال النتيجة إلى استوديو المحرر PixelMatrix
  const handleProceedToEditor = () => {
    if (processedResultUri) {
      onComplete(processedResultUri);
    }
  };

  return (
    <div className="w-full flex flex-col items-center min-h-full py-5 px-3 md:px-6 pb-28 text-slate-100">
      {/* فلاش التقاط الصورة السينمائي */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* حقل رفع الصورة المخفي */}
      <input
        type="file"
        accept="image/*"
        ref={uploadInputRef}
        onChange={handleUploadUserPhoto}
        className="hidden"
      />

      <div className="max-w-7xl w-full flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>العودة للمحرر</span>
            </button>

            <div>
              <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                استوديو صور الجوازات والهوية والفيزا (ICAO & Biometric Studio)
              </h2>
              <p className="text-xs text-slate-400">
                فحص توازي واستقامة الرأس والكتفين بيومترياً وتوليد كروت الطباعة الرسمية
              </p>
            </div>
          </div>

          {/* Color & Print Sheet Selectors & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر رفع صورة للفحص */}
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer"
              title="رفع صورة شخصية من جهازك لفحصها وتوليد كروت الطباعة"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>رفع صورة للفحص</span>
            </button>

            {/* Background Color Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-1">
              <button
                onClick={() => setBgColor('white')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  bgColor === 'white' ? 'bg-white text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="أبيض ناصع رسمي (معيار الشنغن الدولي)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
                <span>أبيض</span>
              </button>
              <button
                onClick={() => setBgColor('blue')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  bgColor === 'blue' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="أزرق ملكي رسمي (معيار الهويات الوطنية)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>أزرق</span>
              </button>
              <button
                onClick={() => setBgColor('gray')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  bgColor === 'gray' ? 'bg-slate-300 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="رمادي هادئ"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span>رمادي</span>
              </button>
            </div>

            {/* Print Sheet Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setOutputMode('single')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  outputMode === 'single'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                صورة فردية
              </button>
              <button
                onClick={() => setOutputMode('sheet')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  outputMode === 'sheet'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="توليد ورقة طباعة مقاس 4x6 بوصة تحتوي على 6 صور مصفوفة مع خطوط القص"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>كرت طباعة 6 صور</span>
              </button>
            </div>

            {/* Demo Button */}
            <button
              onClick={handleLoadDemoBiometric}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer"
              title="توليد صورة نموذجية مطابقة للوضعية المختارة جاهزة للتجربة الفورية"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>نموذج فوري</span>
            </button>
          </div>
        </div>

        {/* البطاقات الثلاث للوضعيات الرسمية: 1. الجواز | 2. الفيزا | 3. الهوية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PASSPORT_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset.id);
                  setProcessedResultUri(null);
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-950 border-cyan-400/80 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {preset.id === 'schengen' && <ShieldCheck className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />}
                    {preset.id === 'us_visa' && <Sparkles className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />}
                    {preset.id === 'national_id' && <UserCheck className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />}
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {preset.id === 'schengen' ? '1. صورة الجواز (Passport)' : (preset.id === 'us_visa' ? '2. صورة الفيزا (US Visa)' : '3. بطاقة الهوية (National ID)')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {preset.widthMm} × {preset.heightMm} mm
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Side-by-Side Main Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Pane: Live Camera with Biometric HUD Overlays */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5 shadow-md">
              <Camera className="w-3.5 h-3.5" />
              <span>الكاميرا البيومترية المباشرة</span>
            </div>

            {/* Compliance Percentage Pill */}
            <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-slate-950/85 backdrop-blur-md border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md">
              <span className="text-slate-400 font-normal">المطابقة الدولية:</span>
              <span
                className={`${
                  biometrics?.compliant
                    ? 'text-emerald-400 font-black'
                    : biometrics?.complianceScore >= 75
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                {biometrics ? `${biometrics.complianceScore}%` : '0%'}
              </span>
            </div>

            {/* Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Live Skeleton Canvas Overlay */}
            <canvas
              ref={liveCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
            />

            {/* Biometric HUD Guide Canvas Overlay */}
            <canvas
              ref={hudCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-15"
            />

            {/* Shutter Action Button inside camera view */}
            <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center">
              <button
                onClick={handleCapture}
                disabled={!isCameraReady}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm rounded-full flex items-center gap-2 shadow-xl shadow-emerald-500/30 transition cursor-pointer border-2 border-white/50"
              >
                <Camera className="w-4 h-4" />
                <span>التقاط الصورة الرسمية الآن</span>
              </button>
            </div>

            {/* Camera loading / error */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 p-4 text-center z-30">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">جاري تشغيل الكاميرا وفحص المعايير البيومترية...</p>
                <button
                  type="button"
                  onClick={handleLoadDemoBiometric}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تشغيل النموذج التجريبي الجاهز</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Pane: Official Result & Print Preview */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex flex-col items-center justify-center p-3">
            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-lg text-xs font-semibold text-cyan-400 flex items-center gap-1.5 shadow-md">
              <FileCheck className="w-3.5 h-3.5" />
              <span>
                {outputMode === 'sheet'
                  ? 'ورقة الطباعة الرسمية (6 نسخ - مقاس 4×6")'
                  : 'معاينة صورة الجواز الرسمية (1:1)'}
              </span>
            </div>

            {/* Captured and Processed Image Display */}
            {processedResultUri ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative pt-8 pb-12">
                <img
                  src={processedResultUri}
                  alt="Processed Passport Result"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
                />

                {/* Bottom Actions for Captured Photo */}
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-3 z-20">
                  <button
                    onClick={handleRetake}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة الالتقاط</span>
                  </button>

                  <button
                    onClick={handleProceedToEditor}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                  >
                    <span>تحرير وطباعة اللوحة في PixelMatrix Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-3 text-slate-500">
                <Printer className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">في انتظار التقاط الصورة</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  اضبط وضعية كتفيك ورأسك داخل الإطار البيومتري، والتقط الصورة لتوليد كرت طباعة 6 صور رسمية جاهزة للاستوديو!
                </p>
                <button
                  type="button"
                  onClick={handleLoadDemoBiometric}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>توليد نموذج فوري جاهز للاستعراض</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Biometric Checklist Bar (7 Marks Showcase) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">فحص المعايير البيومترية الدولية (ICAO Compliance Checklist):</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {biometrics?.compliant ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> جميع المعايير مطابقة تماماً - جاهز للالتقاط
                </span>
              ) : (
                'يرجى ضبط استقامة الكتفين وموضع الرأس داخل الإطار الأخضر'
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {biometrics && (
              <>
                {/* 1. Shoulder Level */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    biometrics.checks.shoulderLevel.passed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold">{biometrics.checks.shoulderLevel.name}</p>
                    <p className="text-[10px] text-slate-400">
                      القيمة: <span className="font-mono font-bold text-white">{biometrics.checks.shoulderLevel.value}</span> (المعيار: {biometrics.checks.shoulderLevel.target})
                    </p>
                  </div>
                  {biometrics.checks.shoulderLevel.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>

                {/* 2. Head Tilt */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    biometrics.checks.headTilt.passed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold">{biometrics.checks.headTilt.name}</p>
                    <p className="text-[10px] text-slate-400">
                      الميلان: <span className="font-mono font-bold text-white">{biometrics.checks.headTilt.value}</span> (المعيار: {biometrics.checks.headTilt.target})
                    </p>
                  </div>
                  {biometrics.checks.headTilt.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>

                {/* 3. Head Size */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    biometrics.checks.headSize.passed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold">{biometrics.checks.headSize.name}</p>
                    <p className="text-[10px] text-slate-400">
                      النسبة: <span className="font-mono font-bold text-white">{biometrics.checks.headSize.value}</span> (المعيار: {biometrics.checks.headSize.target})
                    </p>
                  </div>
                  {biometrics.checks.headSize.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>

                {/* 4. Centering */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    biometrics.checks.centered.passed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold">{biometrics.checks.centered.name}</p>
                    <p className="text-[10px] text-slate-400">
                      التموضع: <span className="font-mono font-bold text-white">{biometrics.checks.centered.value}</span> (المعيار: {biometrics.checks.centered.target})
                    </p>
                  </div>
                  {biometrics.checks.centered.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
              </>
            )}

            {!biometrics && (
              <div className="col-span-4 py-2 text-center text-xs text-slate-500">
                قف أمام الكاميرا لبدء الفحص البيومتري التلقائي لاستقامة الكتفين والرأس...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
