import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCcw, Sparkles, Check, AlertCircle, Eye } from 'lucide-react';
import { getPoseDetector } from '../lib/poseDetector';
import { drawPose } from '../lib/poseDrawing';
import { calculatePoseSimilarity } from '../lib/poseSimilarity';

export default function PoseCamera({ referenceImageSrc, referencePose, onCapture, onBack }) {
  const videoRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const refCanvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const streamRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const noPoseCountRef = useRef(0);

  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [validPairsCount, setValidPairsCount] = useState(0);
  const [jointDetails, setJointDetails] = useState({});

  // رسم هيكل الوضعية المرجعية على الجانب الأيسر
  useEffect(() => {
    if (!refCanvasRef.current || !referencePose) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = refCanvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 480;
        const ctx = canvas.getContext('2d');
        drawPose(ctx, [referencePose], canvas.width, canvas.height, false, true);
      }
    };
    img.src = referenceImageSrc;
  }, [referenceImageSrc, referencePose]);

  // تشغيل الكاميرا عبر getUserMedia
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
              ? 'تم رفض إذن الوصول للكاميرا من المتصفح. يُرجى السماح بالوصول للكاميرا في إعدادات المتصفح ثم المحاولة ثانية.'
              : 'تعذر الاتصال بالكاميرا: ' + err.message
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

  // وضع المحاكاة التجريبي في حال عدم توفر كاميرا فعلية أو في بيئات الاختبار
  const handleStartSimulation = useCallback(() => {
    const simCanvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetW = 480;
      const targetH = Math.round(480 * ((img.naturalHeight || 640) / (img.naturalWidth || 480)));
      simCanvas.width = targetW;
      simCanvas.height = targetH;
      const sCtx = simCanvas.getContext('2d');

      let t = 0;
      const drawSimFrame = () => {
        t += 0.03;
        sCtx.clearRect(0, 0, targetW, targetH);
        // رسم الصورة
        sCtx.drawImage(img, 0, 0, targetW, targetH);
        requestAnimationFrame(drawSimFrame);
      };
      drawSimFrame();

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const simStream = simCanvas.captureStream(30);
        streamRef.current = simStream;
        if (videoRef.current) {
          videoRef.current.srcObject = simStream;
          videoRef.current.play().catch(() => {});
          setIsCameraReady(true);
          setCameraError(null);
        }
      } catch (e) {
        console.warn('captureStream not supported:', e);
      }
    };
    img.src = referenceImageSrc || '/test-pose.jpg';
  }, [referenceImageSrc]);

  // حلقة الكشف والمقارنة اللحظية (Detection & Similarity Loop)
  useEffect(() => {
    if (!isCameraReady || !referencePose) return;

    let detector = null;
    let isRunning = true;
    let isProcessing = false;

    async function initAndLoop() {
      try {
        detector = await getPoseDetector();
      } catch (e) {
        console.error('Detector init failed in camera loop:', e);
        return;
      }

      async function detectFrame() {
        if (!isRunning) return;

        const video = videoRef.current;
        const canvas = liveCanvasRef.current;

        if (
          video &&
          canvas &&
          detector &&
          !isProcessing &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          isProcessing = true;
          try {
            // استخدام offscreen canvas لضمان توافق قراءة إطارات الكاميرا في WebGPU/WebGL
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

            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth;
            }
            if (canvas.height !== video.videoHeight) {
              canvas.height = video.videoHeight;
            }

            const ctx = canvas.getContext('2d');

            if (poses && poses.length > 0) {
              noPoseCountRef.current = 0;
              const livePose = poses[0];

              // رسم الهيكل العظمي للمستخدم فوق الكاميرا
              drawPose(ctx, poses, canvas.width, canvas.height, false, true, 0.18);

              // حساب درجة التطابق (Pose Similarity)
              const simResult = calculatePoseSimilarity(referencePose, livePose, 1);
              setSimilarityScore(simResult.score);
              setValidPairsCount(simResult.validPairsCount);
              setJointDetails(simResult.details);
            } else {
              noPoseCountRef.current = (noPoseCountRef.current || 0) + 1;
              if (noPoseCountRef.current >= 3) {
                // مسح الكانفاس وإعادة التصفير إن غاب الشخص لعدة إطارات
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setSimilarityScore(0);
                setValidPairsCount(0);
                setJointDetails({});
              }
            }
          } catch (err) {
            console.warn('[PoseCamera] Detection frame error:', err);
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
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isCameraReady, referencePose]);

  // التقاط الصورة يدوياً من إطار الفيديو
  const handleManualCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;
    const ctx = captureCanvas.getContext('2d');

    // رسم صورة الفيديو الأصلية مطابقة لما يراه المستخدم على الشاشة (Mirrored Selfie View)
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const capturedDataUri = captureCanvas.toDataURL('image/jpeg', 0.95);

    onCapture(capturedDataUri, similarityScore);
  }, [onCapture, similarityScore]);

  // لون شارة التطابق حسب الدرجة
  const getScoreColor = () => {
    if (similarityScore >= 70) return 'from-emerald-500 to-green-500 text-emerald-400 border-emerald-500/40';
    if (similarityScore >= 45) return 'from-cyan-500 to-blue-500 text-cyan-400 border-cyan-500/40';
    return 'from-amber-500 to-orange-500 text-amber-400 border-amber-500/40';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] p-4 text-slate-100">
      <div className="max-w-6xl w-full flex flex-col gap-4">
        {/* Top Control & Score Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              تغيير المرجع
            </button>
            <button
              onClick={handleStartSimulation}
              className="px-2.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 transition text-xs flex items-center gap-1.5 border border-cyan-500/30 cursor-pointer"
              title="محاكاة فيديو كاميرا حية للتجربة السريعة أو العرض التقديمي"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>محاكاة فيديو</span>
            </button>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                مطابقة وضعية الجسم (Side-by-Side)
              </h2>
              <p className="text-xs text-slate-400">
                طابق وضعية جسمك في كاميرتك مع الوضعية المرجعية على اليسار
              </p>
            </div>
          </div>

          {/* Live Match Score Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-slate-400 font-medium">نسبة التطابق:</span>
                <span className={`text-2xl font-black ${similarityScore >= 70 ? 'text-emerald-400' : similarityScore >= 45 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {similarityScore}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {validPairsCount > 0 ? `${validPairsCount} مفاصل مشتركة مُقارنة` : 'قف في إطار الكاميرا'}
              </span>
            </div>

            {/* Score Progress Pill */}
            <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 bg-gradient-to-r ${getScoreColor()}`}
                style={{ width: `${Math.max(5, similarityScore)}%` }}
              />
            </div>

            {/* Capture Button */}
            <button
              onClick={handleManualCapture}
              disabled={!isCameraReady}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>التقاط الصورة الآن</span>
            </button>
          </div>

          {/* Real-time Joint Guidance Badges */}
          {Object.keys(jointDetails).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium ml-1">حالة المفاصل:</span>
              {Object.entries(jointDetails).map(([key, val]) => {
                if (val.ref === null) return null;
                const isMatched = val.diff !== null && val.diff <= 25;
                const isClose = val.diff !== null && val.diff <= 45;
                const labelMap = {
                  leftElbow: 'الكوع الأيسر',
                  rightElbow: 'الكوع الأيمن',
                  leftShoulder: 'الكتف الأيسر',
                  rightShoulder: 'الكتف الأيمن',
                  leftArmSpan: 'امتداد الذراع الأيسر',
                  rightArmSpan: 'امتداد الذراع الأيمن',
                  shoulderSlope: 'ميل الكتفين',
                  leftHip: 'الورك الأيسر',
                  rightHip: 'الورك الأيمن',
                  leftKnee: 'الركبة اليسرى',
                  rightKnee: 'الركبة اليمنى',
                  leftForearm: 'الساعد الأيسر',
                  rightForearm: 'الساعد الأيمن',
                };
                const label = labelMap[key] || key;
                return (
                  <span
                    key={key}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 transition-colors ${
                      isMatched
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                        : isClose
                        ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                        : val.live !== null
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{label}</span>
                    <span>{isMatched ? '✓' : isClose ? '~' : val.live !== null ? '!' : '...'}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Side-by-Side Display View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Pane: Target Reference Pose */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex items-center justify-center">
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-lg text-xs font-semibold text-cyan-400 flex items-center gap-1.5 shadow-md">
              <Eye className="w-3.5 h-3.5" /> الوضعية المستهدفة (المرجع)
            </div>
            <img
              src={referenceImageSrc}
              alt="Reference"
              className="w-full h-full object-contain"
            />
            <canvas
              ref={refCanvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            />
          </div>

          {/* Right Pane: Live User Camera */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 shadow-md">
              <Camera className="w-3.5 h-3.5 text-cyan-400" /> كاميرتك المباشرة
            </div>

            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Skeleton Overlay */}
            <canvas
              ref={liveCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
            />

            {/* Loading / Error States */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <RefreshCcw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">جاري فتح الكاميرا وتهيئة المعالجة العصبية...</p>
                <button
                  type="button"
                  onClick={handleStartSimulation}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>كاميرا غير متوفرة؟ تشغيل المحاكاة التجريبية (Demo Mode)</span>
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-3 text-rose-300">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-sm max-w-sm">{cameraError}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-white border border-slate-700 cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    تشغيل المحاكاة التجريبية
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match Feedback Tips */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>نصيحة: قف في مجال رؤية الكاميرا ليظهر جذعك وذراعاك بوضوح لرسم الهيكل وحساب التطابق.</span>
          </div>
          <span className="text-[11px] text-slate-500">معالجة فورية محلية بنسبة 100% عبر WebGPU</span>
        </div>
      </div>
    </div>
  );
}
