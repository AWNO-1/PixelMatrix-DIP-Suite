import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  Trash2,
  ArrowRight,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { getPoseDetector } from '../lib/poseDetector';
import { drawPose } from '../lib/poseDrawing';
import {
  calculatePoseDisplacement,
  isPoseHolding,
  generateCompositeCanvas,
  TRACKABLE_JOINTS
} from '../lib/poseMotion';

export default function PoseMotion({ onComplete, onExit }) {
  const videoRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const poseHistoryRef = useRef([]);
  const lastCapturedPoseRef = useRef(null);
  const currentLivePoseRef = useRef(null);
  const autoCaptureCooldownRef = useRef(false);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [keyframes, setKeyframes] = useState([]);
  const [captureMode, setCaptureMode] = useState('manual'); // 'manual' | 'auto'
  const [blendMode, setBlendMode] = useState('ghost'); // 'ghost' | 'clones'
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [trajectoryJoint, setTrajectoryJoint] = useState('right_wrist');
  const [isHolding, setIsHolding] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const [compositeDataUri, setCompositeDataUri] = useState(null);

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
              ? 'تم رفض إذن الكاميرا من المتصفح. يُرجى السماح بالوصول للكاميرا ثم المحاولة ثانية.'
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

  // التقاط وضعية يدوية
  const captureCurrentPose = useCallback(() => {
    const video = videoRef.current;
    const livePose = currentLivePoseRef.current;
    if (!video || !livePose) return;

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

    const dataUri = captureCanvas.toDataURL('image/jpeg', 0.95);

    // ضبط إحداثيات المفصل المعكوس أفقياً لتطابق الصورة المعكوسة
    const mirroredPose = {
      ...livePose,
      keypoints: livePose.keypoints.map((kp) => ({
        ...kp,
        x: w - kp.x,
      })),
    };

    const newKeyframe = {
      id: 'pose_' + Date.now(),
      timestamp: Date.now(),
      dataUri,
      pose: mirroredPose,
    };

    setKeyframes((prev) => {
      if (prev.length >= 6) {
        return [...prev.slice(1), newKeyframe]; // أقصى حد 6 وضعيات
      }
      return [...prev, newKeyframe];
    });

    lastCapturedPoseRef.current = livePose;
  }, []);

  // حلقة رصد الوضعيات اللحظية عبر WebGPU والكشف التلقائي (Pose Loop)
  useEffect(() => {
    if (!isCameraReady) return;

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
            // استخدام offscreen canvas لضمان توافق قراءة الفيديو في WebGPU
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
              const livePose = poses[0];
              currentLivePoseRef.current = livePose;

              // رسم الهيكل العظمي المتوهج فوق الكاميرا
              drawPose(ctx, poses, canvas.width, canvas.height, false, true, 0.18);

              // تحديث تاريخ الحركة (Motion History)
              poseHistoryRef.current.push(livePose);
              if (poseHistoryRef.current.length > 30) {
                poseHistoryRef.current.shift();
              }

              // الكشف التلقائي عند ثبات الوضعية (Auto-Keyframe Trigger)
              if (captureMode === 'auto' && !autoCaptureCooldownRef.current) {
                const holding = isPoseHolding(poseHistoryRef.current, 10);
                setIsHolding(holding);

                if (holding) {
                  // التحقق من اختلاف الوضعية عن آخر وضعية ملتقطة
                  const displacement = lastCapturedPoseRef.current
                    ? calculatePoseDisplacement(livePose, lastCapturedPoseRef.current)
                    : 100;

                  if (displacement > 25) {
                    // تشغيل الالتقاط التلقائي
                    autoCaptureCooldownRef.current = true;
                    captureCurrentPose();
                    setAutoProgress(100);

                    // فترة تهدئة 1.8 ثانية بين كل التقاط تلقائي
                    setTimeout(() => {
                      autoCaptureCooldownRef.current = false;
                      setAutoProgress(0);
                    }, 1800);
                  }
                }
              }
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              currentLivePoseRef.current = null;
              setIsHolding(false);
            }
          } catch (err) {
            console.warn('[PoseMotion] Detection error:', err);
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
  }, [isCameraReady, captureMode, captureCurrentPose]);

  // إعادة بناء اللوحة المجمعة (Composite Canvas Rebuild) كلما تغيرت الوضعيات أو الإعدادات
  useEffect(() => {
    let isCancelled = false;

    async function updateComposite() {
      if (keyframes.length === 0) {
        setCompositeDataUri(null);
        if (compositeCanvasRef.current) {
          const c = compositeCanvasRef.current;
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, c.width, c.height);
        }
        return;
      }

      const video = videoRef.current;
      const w = video?.videoWidth || 640;
      const h = video?.videoHeight || 480;

      const compCanvas = await generateCompositeCanvas(keyframes, w, h, {
        blendMode,
        showTrajectory,
        trajectoryJoint,
      });

      if (isCancelled) return;

      const dataUri = compCanvas.toDataURL('image/jpeg', 0.95);
      setCompositeDataUri(dataUri);

      if (compositeCanvasRef.current) {
        const target = compositeCanvasRef.current;
        target.width = w;
        target.height = h;
        const tCtx = target.getContext('2d');
        tCtx.clearRect(0, 0, w, h);
        tCtx.drawImage(compCanvas, 0, 0);
      }
    }

    updateComposite();

    return () => {
      isCancelled = true;
    };
  }, [keyframes, blendMode, showTrajectory, trajectoryJoint]);

  // وضع المحاكاة التجريبي السريع (Demo Stacking Mode)
  const handleLoadDemoPoses = useCallback(() => {
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 640;
    demoCanvas.height = 480;
    const dCtx = demoCanvas.getContext('2d');

    // توليد 3 وضعيات حركية تجريبية متسلسلة
    const demoItems = [
      {
        id: 'demo_1',
        timestamp: Date.now() - 3000,
        color: '#0f172a',
        wristX: 180,
        wristY: 260,
        armAngle: 45,
        title: 'وضعية الانطلاق',
      },
      {
        id: 'demo_2',
        timestamp: Date.now() - 1500,
        color: '#1e293b',
        wristX: 320,
        wristY: 150,
        armAngle: 90,
        title: 'ذروة الحركة',
      },
      {
        id: 'demo_3',
        timestamp: Date.now(),
        color: '#020617',
        wristX: 460,
        wristY: 270,
        armAngle: 135,
        title: 'وضعية الاستقرار',
      },
    ];

    const generated = demoItems.map((item, idx) => {
      dCtx.fillStyle = '#090d16';
      dCtx.fillRect(0, 0, 640, 480);

      // رسم خلفية تجريدية للإنسان
      dCtx.save();
      dCtx.fillStyle = '#38bdf8';
      dCtx.globalAlpha = 0.15;
      dCtx.beginPath();
      dCtx.arc(item.wristX, 220, 80, 0, Math.PI * 2);
      dCtx.fill();
      dCtx.restore();

      // رسم شخصية تجريبية بخطوط واضحة
      dCtx.strokeStyle = '#38bdf8';
      dCtx.lineWidth = 6;
      dCtx.lineCap = 'round';

      // الجذع والرأس
      dCtx.beginPath();
      dCtx.arc(item.wristX, 150, 24, 0, Math.PI * 2); // رأس
      dCtx.stroke();
      dCtx.beginPath();
      dCtx.moveTo(item.wristX, 174);
      dCtx.lineTo(item.wristX, 300); // عمود فقري
      dCtx.stroke();

      // الذراع الممتدة
      dCtx.beginPath();
      dCtx.moveTo(item.wristX, 200);
      dCtx.lineTo(item.wristX - 40, 220);
      dCtx.lineTo(item.wristX, item.wristY); // يد
      dCtx.stroke();

      dCtx.font = 'bold 16px sans-serif';
      dCtx.fillStyle = '#94a3b8';
      dCtx.fillText(`تجربة: ${item.title} (#${idx + 1})`, 30, 40);

      const uri = demoCanvas.toDataURL('image/jpeg', 0.95);

      return {
        id: item.id,
        timestamp: item.timestamp,
        dataUri: uri,
        pose: {
          score: 0.95,
          keypoints: [
            { name: 'right_wrist', x: item.wristX, y: item.wristY, score: 0.95 },
            { name: 'left_wrist', x: item.wristX - 80, y: item.wristY + 40, score: 0.9 },
            { name: 'nose', x: item.wristX, y: 150, score: 0.98 },
            { name: 'right_shoulder', x: item.wristX + 25, y: 190, score: 0.95 },
            { name: 'left_shoulder', x: item.wristX - 25, y: 190, score: 0.95 },
          ],
        },
      };
    });

    setKeyframes(generated);
  }, []);

  // حذف وضعية معينة
  const handleDeleteKeyframe = (id) => {
    setKeyframes((prev) => prev.filter((k) => k.id !== id));
  };

  // مسح الكل
  const handleClearAll = () => {
    setKeyframes([]);
    lastCapturedPoseRef.current = null;
  };

  // إرسال اللوحة الناتجة إلى محرر PixelMatrix الرئيسي
  const handleExportToEditor = () => {
    if (compositeDataUri) {
      onComplete(compositeDataUri);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[92vh] p-4 text-slate-100">
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
                <Activity className="w-5 h-5 text-cyan-400" />
                استوديو الحركة وتراكب الوضعيات (PoseMotion Studio)
              </h2>
              <p className="text-xs text-slate-400">
                دمج مسارات الحركة المتتابعة (Chronophotography) عبر كشف الوضعيات اللحظي
              </p>
            </div>
          </div>

          {/* Mode Toggles & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Capture Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setCaptureMode('manual')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  captureMode === 'manual'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                التقاط يدوي
              </button>
              <button
                onClick={() => setCaptureMode('auto')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  captureMode === 'auto'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="التقاط تلقائي فوري عند ثباتك في وضعية جديدة"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>التقاط ذكي تلقائي</span>
              </button>
            </div>

            {/* Blend Mode Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setBlendMode('ghost')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  blendMode === 'ghost'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="الأثر الحركي المتلاشي زمنياً (Ghosting Action Trail)"
              >
                الأثر الحركي
              </button>
              <button
                onClick={() => setBlendMode('clones')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  blendMode === 'clones'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="استنساخ الشخص بوضوح متساوٍ (Multi-Pose Clones)"
              >
                استنساخ
              </button>
            </div>

            {/* Trajectory Toggle & Joint Selector */}
            <div className="flex items-center bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs gap-2">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrajectory}
                  onChange={(e) => setShowTrajectory(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>مسار الحركة</span>
              </label>

              {showTrajectory && (
                <select
                  value={trajectoryJoint}
                  onChange={(e) => setTrajectoryJoint(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2 py-1 outline-none"
                >
                  {TRACKABLE_JOINTS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Demo simulation button */}
            <button
              onClick={handleLoadDemoPoses}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-medium border border-cyan-500/20 flex items-center gap-1.5 transition cursor-pointer"
              title="توليد وضعيات حركية جاهزة فوراً للعرض والمناقشة"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>تجربة فورية جاهزة</span>
            </button>

            {/* Clear All Button */}
            {keyframes.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 hover:border-rose-700 transition cursor-pointer"
                title="مسح جميع الوضعيات والبدء من جديد"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Proceed to PixelMatrix Studio CTA */}
            <button
              onClick={handleExportToEditor}
              disabled={keyframes.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <span>تحرير اللوحة في PixelMatrix Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Main Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left / Live Camera Feed with Skeleton Overlay */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 rounded-lg text-xs font-semibold text-cyan-300 flex items-center gap-1.5 shadow-md">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>الكاميرا المباشرة وتتبع المفاصل</span>
            </div>

            {/* Status indicator badge */}
            <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 shadow-md">
              <span className={`w-2 h-2 rounded-full ${isHolding ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{isHolding ? 'وضعية ثابتة (جاهز للالتقاط)' : 'تحرك لاتخاذ وضعية'}</span>
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

            {/* Manual Capture Action Button inside Camera Overlay */}
            <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center">
              <button
                onClick={captureCurrentPose}
                disabled={!isCameraReady}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-sm rounded-full flex items-center gap-2 shadow-xl shadow-cyan-500/40 transition cursor-pointer border-2 border-white/40"
              >
                <Camera className="w-4 h-4" />
                <span>التقاط وضعية الآن (#{keyframes.length + 1})</span>
              </button>
            </div>

            {/* Camera Error / Loading states */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 p-4 text-center z-30">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">جاري تهيئة تتبع المفاصل عبر WebGPU...</p>
                <button
                  type="button"
                  onClick={handleLoadDemoPoses}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تشغيل تجربة المحاكاة الجاهزة</span>
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-3 text-rose-300 z-30">
                <p className="text-sm max-w-sm">{cameraError}</p>
                <button
                  type="button"
                  onClick={handleLoadDemoPoses}
                  className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  تشغيل المحاكاة الجاهزة
                </button>
              </div>
            )}
          </div>

          {/* Right / Live Action Composite Preview Canvas */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex items-center justify-center">
            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 rounded-lg text-xs font-semibold text-cyan-400 flex items-center gap-1.5 shadow-md">
              <Layers className="w-3.5 h-3.5" />
              <span>اللوحة التراكمية الحية (Composite Action Photo)</span>
            </div>

            {/* Pose Count Badge */}
            <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-700 rounded-lg text-xs font-medium text-slate-300 shadow-md">
              <span>{keyframes.length} وضعيات مدمجة</span>
            </div>

            {/* The Actual Composite Canvas */}
            <canvas
              ref={compositeCanvasRef}
              className="w-full h-full object-cover"
            />

            {/* Empty state hint */}
            {keyframes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 text-slate-500">
                <Layers className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">لم يتم التقاط أي وضعية بعد</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  التقط وضعية أولى وثانية وثالثة لتشاهد كيف تندمج مسارات حركتك في لوحة سينمائية متتالية في الوقت الحقيقي!
                </p>
                <button
                  type="button"
                  onClick={handleLoadDemoPoses}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>توليد نموذج تجريبي جاهز (3 وضعيات)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Timeline: Captured Keyframe Pose Slots */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">الوضعيات الملتقطة في مسار الحركة ({keyframes.length}/6):</span>
              <span className="text-[11px] text-slate-500">
                (يمكنك حذف أي لقطة بالضغط عليها، وتعديل نمط الأثر الحركي من الأعلى)
              </span>
            </div>
            <span className="text-[11px] text-cyan-400">
              معالجة فورية بنسبة 100% عبر WebGPU + BlazePose
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {keyframes.map((kf, index) => (
              <div
                key={kf.id}
                className="relative group shrink-0 w-32 aspect-[4/3] rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 shadow-md"
              >
                <img
                  src={kf.dataUri}
                  alt={`Pose ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-cyan-400">
                  #{index + 1}
                </div>
                <button
                  onClick={() => handleDeleteKeyframe(kf.id)}
                  className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="حذف هذه الوضعية"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {keyframes.length < 6 && (
              <button
                onClick={captureCurrentPose}
                disabled={!isCameraReady}
                className="shrink-0 w-32 aspect-[4/3] rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 transition gap-1.5 cursor-pointer text-xs"
              >
                <Camera className="w-5 h-5 text-slate-500" />
                <span>+ وضعية جديدة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
