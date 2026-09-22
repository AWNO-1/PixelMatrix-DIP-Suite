import React, { useRef, useState } from 'react';
import {
  Sliders,
  Layers,
  Info,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Sparkles,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Palette,
  Wand2,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  Activity,
  BarChart2,
  Binary,
  Cpu,
  Grid,
  Check,
  Layers as LayersIcon,
  Scissors,
  Image as ImageIcon,
  Frame,
  MousePointerClick,
  Download,
  Combine,
  Waves,
  UploadCloud,
  PenTool,
  Eraser,
  MoveRight,
  Square,
  Circle,
  Type,
  Undo2,
  ChevronUp,
  ChevronDown,
  Copy,
  Plus,
  ImagePlus,
  ShoppingBag,
  Boxes,
  PanelRightClose
} from 'lucide-react';
import { downloadDataUri } from '../services/api';

/**
 * لوحة التحكم والمعايير التقنية اليمنى (Floating RightPanel Component)
 * لوحة عائمة بتصميم زجاجي نيون (Electric Cyan Glassmorphism)
 */
export default function RightPanel({
  activeTool = 'adjust',
  hasImage = false,
  currentImage = null,
  imageDimensions = { width: 1280, height: 720 },
  onApplyDIP,
  onApplySpatial,
  onApplyPointOp,
  onApplyAdvancedSpatial,
  onApplyLUT,
  onApplyRestoration,
  onApplyMorphology,
  onApplySegmentation,
  onEmbedStego,
  onExtractStego,
  psnrMetrics = { psnr: '∞ dB', mse: '0.00' },
  onCalculatePSNR,
  onApplyAI,
  onApplyFinal,
  onRotateCW,
  onRotateCCW,
  onRotate180,
  onRotateFree,
  onFlip,
  onCrop,
  liveHistogram = null,
  lastOperation = null,
  processingInfo = null,
  alphaMask = null,
  cropAspect = 'free',
  setCropAspect,
  cropInset = 0,
  setCropInset,
  drawParams,
  setDrawParams,
  onTriggerDrawAction,
  onApplyArithmetic,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('properties');

  // معاملات معالجة البكسل (Point Operations)
  const [pixelValues, setPixelValues] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    gamma: 1.0,
    threshold: 128
  });

  // معاملات العمليات النقطية الموسعة (Log, Contrast Stretch, Bit-plane)
  const [logC, setLogC] = useState(46);
  const [contrastPoints, setContrastPoints] = useState({ r1: 50, s1: 10, r2: 200, s2: 245 });
  const [selectedBit, setSelectedBit] = useState(7);

  // معاملات الفلاتر المكانية الموسعة (Spatial Filters)
  const [activeFilterTab, setActiveFilterTab] = useState('gaussian');
  const [gaussianParams, setGaussianParams] = useState({ ksize: 5, sigma: 1.5 });
  const [medianParams, setMedianParams] = useState({ ksize: 5 });
  const [bilateralParams, setBilateralParams] = useState({ d: 9, sigmaColor: 75, sigmaSpace: 75 });
  const [sobelParams, setSobelParams] = useState({ direction: 'magnitude', ksize: 3 });
  const [prewittDir, setPrewittDir] = useState('magnitude');
  const [highboostA, setHighboostA] = useState(1.5);
  const [cannyParams, setCannyParams] = useState({ threshold1: 50, threshold2: 140 });
  const [sharpenParams, setSharpenParams] = useState({ amount: 1.0, method: 'unsharp' });

  // معاملات تجزئة وعزل الألوان (Segmentation)
  const [segSubTab, setSegSubTab] = useState('masking');
  const [colorMaskTarget, setColorMaskTarget] = useState('#ef4444');
  const [colorMaskTol, setColorMaskTol] = useState(60);
  const [colorMaskMode, setColorMaskMode] = useState('isolate');
  const [kmeansK, setKmeansK] = useState(4);
  const [kmeansIter, setKmeansIter] = useState(8);

  // معاملات معمل الضوضاء والترميم (Noise & Restoration)
  const [restoreSubTab, setRestoreSubTab] = useState('restore');
  const [noiseType, setNoiseType] = useState('gaussian');
  const [noiseSigma, setNoiseSigma] = useState(25);
  const [noiseDensity, setNoiseDensity] = useState(5);
  const [noiseRange, setNoiseRange] = useState(40);
  const [restoreFilter, setRestoreFilter] = useState('arithmetic_mean');
  const [restoreKSize, setRestoreKSize] = useState(3);
  const [restoreQ, setRestoreQ] = useState(1.5);
  const [restoreD, setRestoreD] = useState(2);
  const [restoreNoiseVar, setRestoreNoiseVar] = useState(400);

  // معاملات المعالجة المورفولوجية (Morphology)
  const [morphSEType, setMorphSEType] = useState('square');
  const [morphSESize, setMorphSESize] = useState(3);

  // معاملات الرؤية الطيفية والحرارية (Thermal LUTs)
  const [selectedLUT, setSelectedLUT] = useState('ironbow');

  // معاملات إخفاء وتشفير البيانات (Steganography)
  const [stegoSubTab, setStegoSubTab] = useState('embed');
  const [stegoMsg, setStegoMsg] = useState('PixelMatrix 2026 Secret Message');
  const [extractedMsg, setExtractedMsg] = useState('');
  const [stegoLoading, setStegoLoading] = useState(false);

  // معاملات مختبر النواة المخصصة للالتفاف (Custom Kernel Playground)
  const [customMatrix, setCustomMatrix] = useState([
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ]);
  const [bias, setBias] = useState(0);
  const [normalize, setNormalize] = useState(false);
  const [activePreset, setActivePreset] = useState('زيادة حدة (Sharpen)');

  // معاملات وحدة الذكاء الاصطناعي: عزل الخلفية + استوديو المنتجات (Step 4)
  const [aiSubTab, setAiSubTab] = useState('removal');
  const [aiBusy, setAiBusy] = useState(false);
  const [bgModel, setBgModel] = useState('u2netp');
  const [mattingThreshold, setMattingThreshold] = useState(0);
  const [grabcutRefine, setGrabcutRefine] = useState(false);
  const [grabcutIter, setGrabcutIter] = useState(2);
  const [backdrop, setBackdrop] = useState('studio-sweep');
  const [studioColor1, setStudioColor1] = useState('#e8ecf2');
  const [studioColor2, setStudioColor2] = useState('#16202f');
  const [studioScale, setStudioScale] = useState(0.85);
  const [studioPosition, setStudioPosition] = useState('bottom');
  const [studioOffsetY, setStudioOffsetY] = useState(0);
  const [studioRotation, setStudioRotation] = useState(0);
  const [studioShadow, setStudioShadow] = useState(true);
  const [shadowStrength, setShadowStrength] = useState(0.45);
  const [studioReflection, setStudioReflection] = useState(false);
  const [reflectionStrength, setReflectionStrength] = useState(0.25);
  const [studioVignette, setStudioVignette] = useState(0.15);
  const [autoCutout, setAutoCutout] = useState(false);

  // معاملات الوحدات الختامية: التحويلات + المزج + FFT + التصدير (Steps 5 & 6)
  const [transformParams, setTransformParams] = useState({
    quarterTurns: 0, freeAngle: 0, flip: 'none', aspect: 'free', cropInset: 0
  });
  const [blendParams, setBlendParams] = useState({
    mode: 'multiply', opacity: 0.6, overlayType: 'color', color: '#0f1b2d'
  });
  const [overlayImage, setOverlayImage] = useState(null);
  const [fftParams, setFftParams] = useState({ filterType: 'lowpass', profile: 'gaussian', cutoff: 30 });
  const [labSubTab, setLabSubTab] = useState('kernel');
  const [exportParams, setExportParams] = useState({ format: 'png', quality: 95 });
  const [finalBusy, setFinalBusy] = useState(false);

  // معاملات معمل الحسابات والمزج الرقمي (Image Arithmetic & Blending Lab)
  const [arithmeticParams, setArithmeticParams] = useState({
    operation: 'subtract',
    alpha: 0.5
  });
  const [arithmeticFeedback, setArithmeticFeedback] = useState(null);
  const [isExportExpanded, setIsExportExpanded] = useState(false);

  const handleApplyArithmeticOp = async () => {
    if (!onApplyArithmetic || finalBusy || !overlayImage) return;
    setFinalBusy(true);
    setArithmeticFeedback(null);
    try {
      const res = await onApplyArithmetic(overlayImage, arithmeticParams.operation, arithmeticParams.alpha);
      if (res && res.success) {
        setArithmeticFeedback({ success: true, message: 'تم تطبيق العملية الحسابية بنجاح على الكانفاس (استخدم Ctrl+Z للتراجع)' });
      } else {
        setArithmeticFeedback({ success: false, message: res?.error || 'حدث خطأ أثناء معالجة الصور' });
      }
    } catch (err) {
      setArithmeticFeedback({ success: false, message: err?.message || 'تعذر استكمال العملية الحسابية' });
    } finally {
      setFinalBusy(false);
    }
  };

  // معالجة تطبيق تعديل السطوع والتباين
  const handleApplyBrightnessContrast = () => {
    if (onApplyDIP) {
      onApplyDIP('brightness-contrast', {
        brightness: pixelValues.brightness,
        contrast: pixelValues.contrast
      });
    }
  };

  // معالجة تطبيق جاما
  const handleApplyGamma = () => {
    if (onApplyDIP) {
      onApplyDIP('gamma', {
        gamma: pixelValues.gamma
      });
    }
  };

  // معالجة تطبيق الفلاتر المكانية
  const handleApplyFilter = () => {
    if (!hasImage) return;
    if (activeFilterTab === 'gaussian') {
      onApplySpatial && onApplySpatial('blur', {
        blur_type: 'gaussian',
        ksize: Number(gaussianParams.ksize),
        sigma: Number(gaussianParams.sigma)
      });
    } else if (activeFilterTab === 'median') {
      onApplySpatial && onApplySpatial('blur', {
        blur_type: 'median',
        ksize: Number(medianParams.ksize),
        sigma: 1.0
      });
    } else if (activeFilterTab === 'bilateral') {
      onApplySpatial && onApplySpatial('bilateral', {
        d: Number(bilateralParams.d),
        sigma_color: Number(bilateralParams.sigmaColor),
        sigma_space: Number(bilateralParams.sigmaSpace)
      });
    } else if (activeFilterTab === 'sobel') {
      onApplySpatial && onApplySpatial('sobel', {
        direction: sobelParams.direction,
        ksize: Number(sobelParams.ksize)
      });
    } else if (activeFilterTab === 'prewitt') {
      if (onApplyAdvancedSpatial) {
        onApplyAdvancedSpatial('prewitt', { direction: prewittDir });
      } else if (onApplySpatial) {
        onApplySpatial('prewitt', { direction: prewittDir });
      }
    } else if (activeFilterTab === 'canny') {
      if (onApplyAdvancedSpatial) {
        onApplyAdvancedSpatial('canny', { low: Number(cannyParams.threshold1), high: Number(cannyParams.threshold2) });
      } else if (onApplySpatial) {
        onApplySpatial('canny', {
          threshold1: Number(cannyParams.threshold1),
          threshold2: Number(cannyParams.threshold2)
        });
      }
    } else if (activeFilterTab === 'highboost') {
      if (onApplyAdvancedSpatial) {
        onApplyAdvancedSpatial('unsharp_highboost', { A: Number(highboostA), ksize: 5 });
      } else if (onApplySpatial) {
        onApplySpatial('sharpen', { amount: Number(highboostA), method: 'highboost' });
      }
    } else if (activeFilterTab === 'sharpen') {
      onApplySpatial && onApplySpatial('sharpen', {
        amount: Number(sharpenParams.amount),
        method: sharpenParams.method
      });
    }
  };

  // قوالب مصفوفات الالتفاف المخصصة الجاهزة (Kernel Presets)
  const KERNEL_PRESETS = [
    {
      name: 'زيادة حدة (Sharpen)',
      matrix: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
      bias: 0,
      normalize: false
    },
    {
      name: 'كشف الحواف (Laplacian)',
      matrix: [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
      bias: 0,
      normalize: false
    },
    {
      name: 'حواف 8-اتجاهات',
      matrix: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
      bias: 0,
      normalize: false
    },
    {
      name: 'طمس صندوقي (Box Blur)',
      matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
      bias: 0,
      normalize: true
    },
    {
      name: 'تنعيم غاوسي (Gaussian)',
      matrix: [[1, 2, 1], [2, 4, 2], [1, 2, 1]],
      bias: 0,
      normalize: true
    },
    {
      name: 'نقش وتجسيم (Emboss)',
      matrix: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
      bias: 128,
      normalize: false
    },
    {
      name: 'سوبل أفقي (Sobel X)',
      matrix: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
      bias: 0,
      normalize: false
    },
    {
      name: 'الهوية (Identity)',
      matrix: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
      bias: 0,
      normalize: false
    }
  ];

  // تطبيق قالب مصفوفة مسبق
  const selectPreset = (preset) => {
    setActivePreset(preset.name);
    setCustomMatrix(preset.matrix.map(row => [...row]));
    setBias(preset.bias);
    setNormalize(preset.normalize);
  };

  // تعديل خلية في مصفوفة الالتفاف المخصصة
  const handleMatrixCellChange = (rIdx, cIdx, val) => {
    const updated = customMatrix.map((row, r) => 
      row.map((cell, c) => (r === rIdx && c === cIdx ? val : cell))
    );
    setCustomMatrix(updated);
    setActivePreset(null);
  };

  // حساب مجموع معاملات النواة
  const matrixSum = customMatrix.reduce((acc, row) => 
    acc + row.reduce((rAcc, cell) => rAcc + (parseFloat(cell) || 0), 0), 0
  );

  // معالجة تطبيق الالتفاف المخصص
  const handleApplyCustomKernel = () => {
    if (!onApplySpatial) return;
    const parsedMatrix = customMatrix.map(row =>
      row.map(cell => {
        const v = typeof cell === 'number' ? cell : parseFloat(cell);
        return isNaN(v) ? 0.0 : v;
      })
    );
    onApplySpatial('custom-kernel', {
      kernel: parsedMatrix,
      bias: Number(bias) || 0.0,
      normalize: Boolean(normalize)
    });
  };

  // عزل الخلفية الذكي بنقرة واحدة (U-2-Net + GrabCut Refine)
  const handleRemoveBackground = async () => {
    if (!onApplyAI || aiBusy) return;
    setAiBusy(true);
    try {
      await onApplyAI('remove-bg', {
        model: bgModel,
        matting_threshold: Number(mattingThreshold),
        refine_grabcut: Boolean(grabcutRefine),
        grabcut_iter: Number(grabcutIter)
      });
    } finally {
      setAiBusy(false);
    }
  };

  // دمج المنتج المعزول فوق خلفية الاستوديو المختارة
  const handleCompositeProduct = async () => {
    if (!onApplyAI || aiBusy) return;
    setAiBusy(true);
    try {
      await onApplyAI('composite-product', {
        backdrop: backdrop,
        color1: studioColor1,
        color2: studioColor2,
        scale: Number(studioScale),
        position: studioPosition,
        offsetY: Number(studioOffsetY),
        rotation: Number(studioRotation),
        shadow: Boolean(studioShadow),
        shadow_strength: Number(shadowStrength),
        shadowStrength: Number(shadowStrength),
        reflection: Boolean(studioReflection),
        reflectionStrength: Number(reflectionStrength),
        vignette: Number(studioVignette),
        autoCutout: Boolean(autoCutout)
      });
    } finally {
      setAiBusy(false);
    }
  };

  // ====== معالجات الوحدات الختامية (Steps 5 & 6) ======

  // حساب صندوق القص المركزي من نسبة الأبعاد ونسبة الهامش
  const buildCenterCropBox = () => {
    const { width, height } = imageDimensions;
    if (!width || !height) return null;
    const inset = Number(transformParams.cropInset) / 100;
    const cw = Math.max(2, Math.round(width * (1 - 2 * inset)));
    const ch = Math.max(2, Math.round(height * (1 - 2 * inset)));
    return [Math.round((width - cw) / 2), Math.round((height - ch) / 2), cw, ch];
  };

  // التحويلات الهندسية: دوران + قلب + قص بنسبة
  const handleApplyTransform = async (overrides = {}) => {
    if (!onApplyFinal || finalBusy) return;
    setFinalBusy(true);
    try {
      const tp = { ...transformParams, ...overrides };
      const cropBox = (tp.aspect !== 'free' || tp.cropInset > 0) ? buildCenterCropBox() : null;
      await onApplyFinal('transform/apply', {
        quarter_turns: Number(tp.quarterTurns),
        free_angle: Number(tp.freeAngle),
        flip: tp.flip,
        aspect: tp.aspect,
        ...(cropBox ? { crop_x: cropBox[0], crop_y: cropBox[1], crop_w: cropBox[2], crop_h: cropBox[3] } : {})
      });
    } finally {
      setFinalBusy(false);
    }
  };

  // رفع صورة الطبقة العلوية للمزج
  const handleOverlayFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setOverlayImage(event.target.result);
      setBlendParams((p) => ({ ...p, overlayType: 'image' }));
    };
    reader.readAsDataURL(file);
  };

  // دمج الطبقات بأنماط المزج
  const handleApplyBlend = async () => {
    if (!onApplyFinal || finalBusy) return;
    setFinalBusy(true);
    try {
      await onApplyFinal('blend/apply', {
        overlay_type: blendParams.overlayType,
        overlay_image: blendParams.overlayType === 'image' ? overlayImage : null,
        color: blendParams.color,
        mode: blendParams.mode,
        opacity: Number(blendParams.opacity)
      });
    } finally {
      setFinalBusy(false);
    }
  };

  // عرض طيف السعة (Magnitude Spectrum)
  const handleShowSpectrum = async () => {
    if (!onApplyFinal || finalBusy) return;
    setFinalBusy(true);
    try {
      await onApplyFinal('frequency/fft', {});
    } finally {
      setFinalBusy(false);
    }
  };

  // تطبيق الفلتر الترددي Low/High Pass
  const handleApplyFreqFilter = async () => {
    if (!onApplyFinal || finalBusy) return;
    setFinalBusy(true);
    try {
      await onApplyFinal('frequency/filter', {
        filter_type: fftParams.filterType,
        profile: fftParams.profile,
        cutoff: Number(fftParams.cutoff)
      });
    } finally {
      setFinalBusy(false);
    }
  };

  // التصدير النهائي: تجهيز الملف ثم تنزيله من المتصفح
  const handleExport = async () => {
    if (!onApplyFinal || finalBusy) return;
    setFinalBusy(true);
    try {
      const data = await onApplyFinal('export/download', {
        image_format: exportParams.format,
        quality: Number(exportParams.quality)
      });
      if (data?.success && data.image && data.extra_data?.download_name) {
        downloadDataUri(data.image, data.extra_data.download_name);
      }
    } finally {
      setFinalBusy(false);
    }
  };

  // واجهة استوديو خلفيات المنتجات ثلاثية الأبعاد (3D Product Studio UI)
  const renderProductStudioControls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
        <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-cyan-400" />
          <span>3D PRODUCT STUDIO & BACKDROPS</span>
        </h3>
        <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
          STUDIO 3D
        </span>
      </div>

      <div className="p-3 bg-gradient-to-tr from-cyan-950/40 via-blue-950/30 to-slate-900/60 rounded-2xl border border-cyan-500/30 space-y-2">
        <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs font-sans">
          <Frame className="w-4 h-4 text-cyan-400" />
          <span>استوديو خلفيات المنتجات الاحترافي</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          دمج المنتج المعزول فوق خلفيات ومنصات ثلاثية الأبعاد مع ظلال أرضية واقعية، إضاءات بؤرية، وانعكاسات فاخرة.
        </p>

        {/* خيار العزل التلقائي إن كانت الصورة صلبة */}
        <label className="flex items-center justify-between text-[11px] text-slate-200 bg-slate-950/80 p-2.5 rounded-xl border border-cyan-500/20 cursor-pointer select-none">
          <span className="font-sans flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>عزل ذكي لخلفية المنتج تلقائياً (Smart Cutout)</span>
          </span>
          <input
            type="checkbox"
            checked={autoCutout}
            onChange={(e) => setAutoCutout(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* نوع الخلفية */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400 font-mono font-semibold block">BACKDROP TYPE:</span>
          <span className="text-[9.5px] font-mono text-cyan-400 uppercase">{backdrop}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {[
            { id: 'studio-sweep', label: 'استوديو منحنى' },
            { id: 'podium', label: 'منصة 3D' },
            { id: 'neon-glow', label: 'نيون سايبر' },
            { id: 'radial-gradient', label: 'إضاءة بؤرية' },
            { id: 'vertical-gradient', label: 'تدرج رأسي' },
            { id: 'solid', label: 'لون صافٍ' },
            { id: 'checkerboard', label: 'شطرنج شفاف' }
          ].map(b => (
            <button
              key={b.id}
              onClick={() => setBackdrop(b.id)}
              className={`py-2 px-1 rounded-xl text-center border transition-all ${
                backdrop === b.id
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 font-bold shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-cyan-500/30'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* منتقي الألوان وقوالب الاستوديو */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
        <span className="text-[11px] text-slate-300 font-sans font-semibold block">ألوان الاستوديو (Studio Palette):</span>
        
        {/* أزرار نماذج ألوان جاهزة */}
        <div className="flex items-center gap-1.5 pb-1">
          {[
            { name: 'Clean White', c1: '#f8fafc', c2: '#cbd5e1' },
            { name: 'Obsidian Dark', c1: '#1e293b', c2: '#0b0f19' },
            { name: 'Electric Cyan', c1: '#06b6d4', c2: '#0f172a' },
            { name: 'Warm Amber', c1: '#fef3c7', c2: '#78350f' },
            { name: 'Rose Luxury', c1: '#ffe4e6', c2: '#881337' }
          ].map(pal => (
            <button
              key={pal.name}
              title={pal.name}
              onClick={() => { setStudioColor1(pal.c1); setStudioColor2(pal.c2); }}
              className="flex-1 h-5 rounded-md border border-white/20 overflow-hidden flex transition-transform hover:scale-105"
            >
              <div className="w-1/2 h-full" style={{ backgroundColor: pal.c1 }} />
              <div className="w-1/2 h-full" style={{ backgroundColor: pal.c2 }} />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="space-y-1 text-xs text-slate-300 cursor-pointer">
            <span className="block font-sans text-[11px]">اللون الأساسي (Primary):</span>
            <input
              type="color"
              value={studioColor1}
              onChange={(e) => setStudioColor1(e.target.value)}
              className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-cyan-500/30"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-300 cursor-pointer">
            <span className="block font-sans text-[11px]">اللون الثانوي (Secondary):</span>
            <input
              type="color"
              value={studioColor2}
              onChange={(e) => setStudioColor2(e.target.value)}
              className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-cyan-500/30"
            />
          </label>
        </div>
      </div>

      {/* تحجيم وتموضع المنتج */}
      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-sans">مقياس حجم المنتج (Scale)</span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(studioScale * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="1.6"
            step="0.05"
            value={studioScale}
            onChange={(e) => setStudioScale(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* نقطة الارتكاز */}
        <div className="space-y-1">
          <span className="text-[11px] text-slate-400 font-sans block">نقطة ارتكاز المنتج:</span>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            {[
              { id: 'bottom', label: 'أرضية الاستوديو / المنصة' },
              { id: 'center', label: 'معلق في الوسط (Center)' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setStudioPosition(p.id)}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  studioPosition === p.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* إزاحة رأسية دقيقة وزاوية ميل */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-sans">إزاحة رأسية (Y)</span>
              <span className="font-mono text-cyan-400">{studioOffsetY}%</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={studioOffsetY}
              onChange={(e) => setStudioOffsetY(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-sans">زاوية الميل (Tilt)</span>
              <span className="font-mono text-cyan-400">{studioRotation}°</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={studioRotation}
              onChange={(e) => setStudioRotation(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* الظلال والانعكاسات وتعتيم الأطراف */}
      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer select-none">
          <span className="font-sans">ظل أرضي واقعي (Contact & Cast Shadow):</span>
          <input
            type="checkbox"
            checked={studioShadow}
            onChange={(e) => setStudioShadow(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
          />
        </label>

        {studioShadow && (
          <div className="space-y-1 pl-2 border-l border-cyan-500/20">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-sans">شدة الظل</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(shadowStrength * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={shadowStrength}
              onChange={(e) => setShadowStrength(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer select-none pt-1 border-t border-cyan-500/10">
          <span className="font-sans">انعكاس أرضي مصقول (Floor Reflection):</span>
          <input
            type="checkbox"
            checked={studioReflection}
            onChange={(e) => setStudioReflection(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
          />
        </label>

        {studioReflection && (
          <div className="space-y-1 pl-2 border-l border-cyan-500/20">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-sans">شفافية الانعكاس</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(reflectionStrength * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.05"
              value={reflectionStrength}
              onChange={(e) => setReflectionStrength(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        <div className="space-y-1 pt-1 border-t border-cyan-500/10">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-sans">عدسة تعتيم الأطراف (Vignette)</span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(studioVignette * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={studioVignette}
            onChange={(e) => setStudioVignette(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* زر التوليد والدمج */}
      <button
        disabled={!hasImage || aiBusy}
        onClick={handleCompositeProduct}
        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-40"
      >
        {aiBusy ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>جارٍ توليد الاستوديو...</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            <span>توليد وتطبيق استوديو المنتجات (APPLY)</span>
          </>
        )}
      </button>
    </div>
  );

  // واجهة تجزئة وعزل الألوان (Segmentation & Clustering UI)
  const renderSegmentationControls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
        <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span>SEGMENTATION &amp; CLUSTERING</span>
        </h3>
        <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
          {segSubTab === 'masking' ? 'CHROMA / MASK' : 'K-MEANS'}
        </span>
      </div>

      {/* التبويب الداخلي: عزل كروما / K-Means */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[11px] font-mono">
        <button
          onClick={() => setSegSubTab('masking')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            segSubTab === 'masking'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>عزل كروما ولون</span>
        </button>
        <button
          onClick={() => setSegSubTab('kmeans')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            segSubTab === 'kmeans'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>تجزئة K-Means</span>
        </button>
      </div>

      {/* 1. عزل كروما وتفريغ لوني */}
      {segSubTab === 'masking' && (
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-sans block">اللون المستهدف للعزل (Target Color):</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorMaskTarget}
                onChange={(e) => setColorMaskTarget(e.target.value)}
                className="w-10 h-8 rounded-lg border border-cyan-500/30 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-xs text-cyan-300 font-bold">{colorMaskTarget.toUpperCase()}</span>
              {/* قوالب سريعة */}
              <div className="flex items-center gap-1.5 mr-auto">
                {[
                  { color: '#10b981', label: 'كروما خضراء' },
                  { color: '#3b82f6', label: 'كروما زرقاء' },
                  { color: '#ef4444', label: 'أحمر' },
                  { color: '#ffffff', label: 'أبيض' },
                  { color: '#000000', label: 'أسود' }
                ].map((p) => (
                  <button
                    key={p.color}
                    onClick={() => setColorMaskTarget(p.color)}
                    style={{ backgroundColor: p.color }}
                    title={p.label}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                      colorMaskTarget.toLowerCase() === p.color ? 'border-cyan-400 scale-110 ring-2 ring-cyan-400/50' : 'border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-sans">سماحية التقارب (Tolerance ΔE)</span>
              <span className="font-mono text-cyan-400 font-bold">{colorMaskTol}</span>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              step="2"
              value={colorMaskTol}
              onChange={(e) => setColorMaskTol(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-sans block">نمط الإخراج الناتج (Output Mode):</span>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <button
                onClick={() => setColorMaskMode('isolate')}
                className={`py-2 rounded-lg text-center transition-all ${
                  colorMaskMode === 'isolate'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                تفريغ شفاف (Chroma Key)
              </button>
              <button
                onClick={() => setColorMaskMode('binary')}
                className={`py-2 rounded-lg text-center transition-all ${
                  colorMaskMode === 'binary'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                قناع ثنائي (Binary Mask)
              </button>
            </div>
          </div>

          <span className="text-[9px] text-cyan-500/70 block font-mono">
            DIP: Euclidean RGB Distance ||C(x,y) - C_target|| &lt; Tol
          </span>

          <button
            disabled={!hasImage}
            onClick={() => onApplySegmentation && onApplySegmentation('color_mask', {
              targetColor: colorMaskTarget,
              tolerance: colorMaskTol,
              mode: colorMaskMode
            })}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-mono"
          >
            <Scissors className="w-4 h-4" />
            <span>APPLY COLOR MASK SEGMENTATION</span>
          </button>
        </div>
      )}

      {/* 2. تكميم وتجزئة K-Means */}
      {segSubTab === 'kmeans' && (
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-sans">عدد العناقيد اللونية (Clusters K)</span>
              <span className="font-mono text-cyan-400 font-bold">K = {kmeansK}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 font-mono text-xs">
              {[2, 3, 4, 6, 8].map(k => (
                <button
                  key={k}
                  onClick={() => setKmeansK(k)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    kmeansK === k
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  K={k}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={kmeansK}
              onChange={(e) => setKmeansK(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-sans">أقصى تكرارات التقارب (Max Iterations)</span>
              <span className="font-mono text-cyan-400 font-bold">{kmeansIter} iter</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="1"
              value={kmeansIter}
              onChange={(e) => setKmeansIter(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2.5 bg-cyan-950/30 rounded-lg border border-cyan-500/20 text-[10px] text-slate-300 leading-relaxed font-sans">
            خوارزمية K-Means تقوم بتجميع بكسلات الصورة في K لوناً رئيسياً عن طريق تصغير مجموع مربعات المسافات الإقليدية لمراكز الكتل.
          </div>

          <button
            disabled={!hasImage}
            onClick={() => onApplySegmentation && onApplySegmentation('kmeans', {
              k: kmeansK,
              maxIter: kmeansIter
            })}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
          >
            <Grid className="w-4 h-4" />
            <span>RUN K-MEANS COLOR QUANTIZATION</span>
          </button>
        </div>
      )}
    </div>
  );

  // واجهة معمل الضوضاء والترميم (Restoration Lab UI)
  const renderRestorationControls = () => {
    const psnrNum = parseFloat(psnrMetrics?.psnr);
    const isPristine = psnrMetrics?.psnr === '∞ dB' || (!isNaN(psnrNum) && psnrNum >= 35);
    const isGood = !isNaN(psnrNum) && psnrNum >= 28 && psnrNum < 35;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
          <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>RESTORATION &amp; NOISE LAB</span>
          </h3>
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
            METRICS &amp; FILTERS
          </span>
        </div>

        {/* لوحة قياس الجودة الرياضية الحية (Live Quality Telemetry) */}
        <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-3 rounded-2xl border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>LIVE QUALITY TELEMETRY</span>
            </div>
            <button
              onClick={() => onCalculatePSNR && onCalculatePSNR()}
              title="إعادة حساب معايير الجودة"
              className="p-1 hover:bg-cyan-950/60 rounded text-cyan-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/15">
              <span className="block text-[9.5px] font-mono text-slate-400">PSNR (نسبة الإشارة للضجيج)</span>
              <span className="text-sm font-mono font-bold text-cyan-300">{psnrMetrics?.psnr || '∞ dB'}</span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/15">
              <span className="block text-[9.5px] font-mono text-slate-400">MSE (متوسط مربع الخطأ)</span>
              <span className="text-sm font-mono font-bold text-cyan-300">{psnrMetrics?.mse || '0.00'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono pt-1">
            <span className="text-slate-400 font-sans">حالة الجودة بالنسبة للأصل:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              isPristine 
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' 
                : isGood 
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
            }`}>
              {isPristine ? '✓ نقية ممتازة (Pristine)' : isGood ? '⚡ مقبولة (Good)' : '⚠ مشوهة (Degraded)'}
            </span>
          </div>
        </div>

        {/* Sub-tabs: Noise vs Restore */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[11px] font-mono">
          <button
            onClick={() => setRestoreSubTab('noise')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              restoreSubTab === 'noise'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>حقن الضوضاء</span>
          </button>
          <button
            onClick={() => setRestoreSubTab('restore')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              restoreSubTab === 'restore'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فلاتر الترميم</span>
          </button>
        </div>

        {/* 1. حقن الضوضاء */}
        {restoreSubTab === 'noise' && (
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
            <div className="space-y-1.5">
              <span className="text-xs text-slate-300 font-sans block">نوع الضوضاء المراد محاكاتها:</span>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                {[
                  { id: 'gaussian', label: 'Gaussian', ar: 'غاوسية' },
                  { id: 'salt_pepper', label: 'S & P', ar: 'ملح وفلفل' },
                  { id: 'uniform', label: 'Uniform', ar: 'منتظمة' }
                ].map(n => (
                  <button
                    key={n.id}
                    onClick={() => setNoiseType(n.id)}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      noiseType === n.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block">{n.label}</span>
                    <span className="block text-[8.5px] opacity-70 font-sans">{n.ar}</span>
                  </button>
                ))}
              </div>
            </div>

            {noiseType === 'gaussian' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">الانحراف المعياري للضجيج (Sigma σ)</span>
                  <span className="font-mono text-cyan-400 font-bold">{noiseSigma}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="5"
                  value={noiseSigma}
                  onChange={(e) => setNoiseSigma(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {noiseType === 'salt_pepper' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">كثافة حبيبات الملح والفلفل (Density)</span>
                  <span className="font-mono text-cyan-400 font-bold">{noiseDensity}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={noiseDensity}
                  onChange={(e) => setNoiseDensity(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {noiseType === 'uniform' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">مدى التشتت المنتظم (Range)</span>
                  <span className="font-mono text-cyan-400 font-bold">±{noiseRange}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={noiseRange}
                  onChange={(e) => setNoiseRange(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            <button
              disabled={!hasImage}
              onClick={() => onApplyRestoration && onApplyRestoration('noise', {
                noiseType,
                sigma: noiseSigma,
                density: noiseDensity,
                range: noiseRange
              })}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Activity className="w-4 h-4" />
              <span>INJECT SYNTHETIC NOISE</span>
            </button>
          </div>
        )}

        {/* 2. فلاتر الترميم */}
        {restoreSubTab === 'restore' && (
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
            <div className="space-y-1.5">
              <span className="text-xs text-slate-300 font-sans block">فلتر المعالجة وإزالة الضوضاء:</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                {[
                  { id: 'arithmetic_mean', label: 'Arithmetic Mean', ar: 'متوسط حسابي' },
                  { id: 'geometric_mean', label: 'Geometric Mean', ar: 'متوسط هندسي' },
                  { id: 'harmonic_mean', label: 'Harmonic Mean', ar: 'متوسط توافقي' },
                  { id: 'contraharmonic', label: 'Contraharmonic', ar: 'توافقي عكسي Q' },
                  { id: 'median', label: 'Median Filter', ar: 'وسيط إحصائي (ملح وفلفل)' },
                  { id: 'alpha_trimmed', label: 'Alpha-Trimmed', ar: 'مقطوع ألفا' },
                  { id: 'wiener', label: 'Adaptive Wiener', ar: 'وينر التكيفي' }
                ].map(rf => (
                  <button
                    key={rf.id}
                    onClick={() => setRestoreFilter(rf.id)}
                    className={`py-2 px-1 rounded-lg text-center transition-all ${
                      restoreFilter === rf.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold">{rf.label}</span>
                    <span className="block text-[8.5px] opacity-70 font-sans">{rf.ar}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* حجم النافذة */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">حجم نافذة التصفية (Kernel Size)</span>
                <span className="font-mono text-cyan-400 font-bold">{restoreKSize}×{restoreKSize}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                {[3, 5, 7].map(k => (
                  <button
                    key={k}
                    onClick={() => setRestoreKSize(k)}
                    className={`py-1 rounded-lg text-center transition-all ${
                      restoreKSize === k
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {k}×{k}
                  </button>
                ))}
              </div>
            </div>

            {/* معايير خاصة بالفلتر المختار */}
            {restoreFilter === 'contraharmonic' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">رتبة الفلتر (Contraharmonic Order Q)</span>
                  <span className="font-mono text-cyan-400 font-bold">{restoreQ > 0 ? `+${restoreQ}` : restoreQ}</span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.5"
                  value={restoreQ}
                  onChange={(e) => setRestoreQ(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9px] text-cyan-500/70 block font-mono">
                  Q &gt; 0 يزيل الفلفل (Pepper) | Q &lt; 0 يزيل الملح (Salt)
                </span>
              </div>
            )}

            {restoreFilter === 'alpha_trimmed' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">عدد العناصر المقطوعة (Trim Parameter d)</span>
                  <span className="font-mono text-cyan-400 font-bold">{restoreD}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max={Math.min(8, restoreKSize * restoreKSize - 1)}
                  step="2"
                  value={restoreD}
                  onChange={(e) => setRestoreD(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {restoreFilter === 'wiener' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-sans">تباين الضوضاء المقدر (Noise Var σ_n²)</span>
                  <span className="font-mono text-cyan-400 font-bold">{restoreNoiseVar}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={restoreNoiseVar}
                  onChange={(e) => setRestoreNoiseVar(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9px] text-cyan-500/70 block font-mono">
                  Wiener: f_hat = μ + [(σ_L² - σ_n²) / σ_L²] · (g - μ)
                </span>
              </div>
            )}

            <button
              disabled={!hasImage}
              onClick={() => onApplyRestoration && onApplyRestoration('filter', {
                filterType: restoreFilter,
                ksize: restoreKSize,
                Q: restoreQ,
                d: restoreD,
                noiseVariance: restoreNoiseVar
              })}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Sparkles className="w-4 h-4" />
              <span>EXECUTE RESTORATION FILTER</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // واجهة العمليات المورفولوجية (Morphological Operations UI)
  const renderMorphologyControls = () => {
    const seDim = morphSESize;
    const center = Math.floor(seDim / 2);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
          <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Binary className="w-4 h-4 text-cyan-400" />
            <span>MORPHOLOGICAL OPERATIONS</span>
          </h3>
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
            SE: {morphSEType.toUpperCase()} {morphSESize}×{morphSESize}
          </span>
        </div>

        {/* اختيار وتخصيص العنصر المهيكل (Structuring Element) */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
          <span className="text-xs text-slate-300 font-sans font-semibold block">العنصر المهيكل (Structuring Element B):</span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-sans block mb-1">الشكل الهندسي:</span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <button
                  onClick={() => setMorphSEType('square')}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    morphSEType === 'square'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Square (مربع)
                </button>
                <button
                  onClick={() => setMorphSEType('cross')}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    morphSEType === 'cross'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Cross (صليب)
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-sans block mb-1">أبعاد النواة:</span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                {[3, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setMorphSESize(s)}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      morphSESize === s
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* معاينة هندسية بصرية للنواة */}
          <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-cyan-500/10">
            <span className="text-[10px] font-mono text-slate-400">STRUCTURING GEOMETRY:</span>
            <div 
              className="grid gap-1 p-1 bg-slate-950 rounded border border-cyan-500/20"
              style={{ gridTemplateColumns: `repeat(${seDim}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: seDim * seDim }).map((_, idx) => {
                const r = Math.floor(idx / seDim);
                const c = idx % seDim;
                const active = morphSEType === 'square' || r === center || c === center;
                return (
                  <div
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-sm transition-all ${
                      active ? 'bg-cyan-400 shadow-sm shadow-cyan-400/80' : 'bg-slate-800 opacity-30'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* شبكة العمليات المورفولوجية السبع */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-300 font-sans block">العملية المورفولوجية المراد تطبيقها:</span>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
            {[
              { id: 'dilate', label: 'Dilation (تمدد)', formula: 'A ⊕ B', desc: 'تكبير السطوع وسد الثغرات' },
              { id: 'erode', label: 'Erosion (تآكل)', formula: 'A ⊖ B', desc: 'تقليص السطوع وحذف النتوءات' },
              { id: 'open', label: 'Opening (فتح)', formula: 'A ∘ B', desc: 'إزالة الضوضاء الدقيقة الخارجية' },
              { id: 'close', label: 'Closing (إغلاق)', formula: 'A • B', desc: 'سد التصدعات والثقوب الداخلية' },
              { id: 'tophat', label: 'Top-Hat (قبعة عليا)', formula: 'A - (A ∘ B)', desc: 'استخلاص العناصر الأسطع محلياً' },
              { id: 'blackhat', label: 'Black-Hat (قبعة سفلى)', formula: '(A • B) - A', desc: 'استخلاص العناصر الأغمق محلياً' },
              { id: 'gradient', label: 'Morph Gradient', formula: '(A⊕B) - (A⊖B)', desc: 'استخراج حدود الكائنات الدقيقة' }
            ].map(m => (
              <button
                key={m.id}
                disabled={!hasImage}
                onClick={() => onApplyMorphology && onApplyMorphology(m.id, morphSEType, morphSESize)}
                className="p-2.5 bg-slate-950/60 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all text-right group disabled:opacity-40"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[11px] group-hover:text-cyan-400 transition-colors">{m.label}</span>
                  <span className="text-[9px] font-mono text-cyan-500/70">{m.formula}</span>
                </div>
                <span className="text-[9.5px] text-slate-400 font-sans block leading-tight">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // واجهة الرؤية الحرارية والطيفية (Thermal & False-Color LUTs UI)
  const renderThermalLUTControls = () => {
    const luts = [
      {
        id: 'ironbow',
        name: 'FLIR Ironbow',
        ar: 'الرؤية الحرارية الصناعية',
        cssGradient: 'linear-gradient(to right, #000004, #3b0f70, #8c2981, #de4968, #fe9f6d, #fcfdbf)',
        desc: 'المعيار العالمي للكاميرات الحرارية الصناعية لكشف التسريبات والحرارة المرتفعة.'
      },
      {
        id: 'jet',
        name: 'FLIR Jet',
        ar: 'الطيف الحراري اللوني',
        cssGradient: 'linear-gradient(to right, #00007f, #0000ff, #007fff, #00ffff, #7fff7f, #ffff00, #ff7f00, #ff0000, #7f0000)',
        desc: 'تدرج طيفي كامل لتمييز الفروقات الطفيفة في درجات الشدة والتصوير الفلكي.'
      },
      {
        id: 'xray',
        name: 'Medical X-Ray',
        ar: 'الأشعة السينية الطبية',
        cssGradient: 'linear-gradient(to right, #050518, #0a1f44, #1b538c, #48cae4, #e0f2fe, #ffffff)',
        desc: 'محاكاة التصوير الشعاعي الطبي وإبراز كثافة العظام والأنسجة.'
      },
      {
        id: 'nightvision',
        name: 'Night Vision Phosphor',
        ar: 'الرؤية الليلية الفسفورية',
        cssGradient: 'linear-gradient(to right, #000000, #002b00, #006600, #00ff00, #b3ffb3)',
        desc: 'محاكاة فوسفور P43 لأجهزة الرؤية الليلية العسكرية وأنابيب تضخيم الفوتونات.'
      },
      {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        ar: 'النيون السينمائي المتوهج',
        cssGradient: 'linear-gradient(to right, #090014, #3c096c, #7b2cbf, #ff007f, #00f0ff)',
        desc: 'تدرج سينمائي عالي التباين يبرز التوهجات النيونية ويعزل الظلال الداكنة.'
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
          <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>FALSE-COLOR &amp; THERMAL VISION</span>
          </h3>
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
            256-COLOR LUT
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          جداول المطابقة اللونية الكاذبة (Look-Up Tables) تحوّل قيم الشدة الرمادية [0..255] إلى فضاءات لونية طيفية لتسهيل الإدراك البصري البشري.
        </p>

        <div className="space-y-2">
          {luts.map((lut) => (
            <button
              key={lut.id}
              disabled={!hasImage}
              onClick={() => {
                setSelectedLUT(lut.id);
                onApplyLUT && onApplyLUT(lut.id);
              }}
              className={`w-full p-3 rounded-xl border text-right transition-all group disabled:opacity-40 ${
                selectedLUT === lut.id
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {lut.name}
                </span>
                <span className="text-[10px] font-sans text-cyan-400/80 font-medium">
                  {lut.ar}
                </span>
              </div>

              {/* شريط التدرج اللوني الحي */}
              <div
                className="w-full h-3 rounded-md mb-2 shadow-inner border border-white/10"
                style={{ background: lut.cssGradient }}
              />

              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                {lut.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // واجهة إخفاء وتشفير البيانات (LSB Steganography UI)
  const renderStegoControls = () => {
    const handleExtract = async () => {
      if (!onExtractStego) return;
      setStegoLoading(true);
      try {
        const msg = await onExtractStego();
        setExtractedMsg(msg || '');
      } finally {
        setStegoLoading(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
          <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>LSB DIGITAL STEGANOGRAPHY</span>
          </h3>
          <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
            BIT-0 HIDING
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          إخفاء البيانات في البتات الأقل أهمية (Least Significant Bit) يتيح تضمين نصوص ورسائل سرية داخل بكسلات الصورة بدون إحداث أي تشويه بصري ملحوظ للعين.
        </p>

        {/* Sub-tabs: Embed vs Extract */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[11px] font-mono">
          <button
            onClick={() => setStegoSubTab('embed')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              stegoSubTab === 'embed'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>تضمين رسالة سرية</span>
          </button>
          <button
            onClick={() => setStegoSubTab('extract')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              stegoSubTab === 'extract'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>استخراج الرسالة</span>
          </button>
        </div>

        {/* 1. Embed Message */}
        {stegoSubTab === 'embed' && (
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">الرسالة السرية المراد حقنها:</span>
                <span className="font-mono text-cyan-400">{stegoMsg.length} حرف</span>
              </div>
              <textarea
                value={stegoMsg}
                onChange={(e) => setStegoMsg(e.target.value)}
                placeholder="اكتب النص السري هنا..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors resize-none font-mono"
              />
            </div>

            <div className="p-2 bg-slate-900/80 rounded-lg border border-cyan-500/10 space-y-1 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>CHANNEL TARGET:</span>
                <span className="text-cyan-300">RED &amp; GREEN LSB (Bit 0)</span>
              </div>
              <div className="flex justify-between">
                <span>ESTIMATED CAPACITY:</span>
                <span className="text-emerald-400">
                  {Math.floor((imageDimensions.width * imageDimensions.height) / 8)} CHARS MAX
                </span>
              </div>
            </div>

            <button
              disabled={!hasImage || !stegoMsg.trim()}
              onClick={() => onEmbedStego && onEmbedStego(stegoMsg)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Lock className="w-4 h-4" />
              <span>EMBED &amp; ENCODE LSB PAYLOAD</span>
            </button>
          </div>
        )}

        {/* 2. Extract Message */}
        {stegoSubTab === 'extract' && (
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
            <button
              disabled={!hasImage || stegoLoading}
              onClick={handleExtract}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
            >
              {stegoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span>EXTRACT SECRET MESSAGE FROM LSB</span>
            </button>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-sans">الرسالة المستخرجة:</span>
                {extractedMsg && (
                  <button
                    onClick={() => navigator.clipboard.writeText(extractedMsg)}
                    className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ النص</span>
                  </button>
                )}
              </div>

              <div className="min-h-[90px] p-3 bg-slate-900/90 rounded-xl border border-cyan-500/20 text-xs font-mono break-all leading-relaxed">
                {extractedMsg ? (
                  <span className="text-emerald-300 font-semibold">{extractedMsg}</span>
                ) : (
                  <span className="text-slate-500 italic">
                    لم يتم استخراج أي رسالة بعد، أو أن الصورة الحالية لا تحتوي على بيانات LSB مشفرة.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside dir="rtl" className="w-80 flex-shrink-0 glass-panel m-3 ml-0 rounded-2xl flex flex-col justify-between select-none z-20 overflow-hidden shadow-2xl">
      {/* رأس اللوحة: التبديل بين التبويبات وزر الإغلاق */}
      <div className="border-b border-cyan-500/15 bg-[#080b12]/80 p-2 flex items-center gap-1.5">
        <div className="grid grid-cols-2 p-1 gap-1.5 text-xs font-mono font-semibold bg-slate-950/70 rounded-xl border border-cyan-500/15 flex-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>المعايير والتحكم</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>بيانات ومعالجة</span>
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="إخفاء لوحة المعايير"
            className="p-2 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 rounded-xl border border-cyan-500/15 hover:border-cyan-500/30 transition-all cursor-pointer shrink-0"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* المحتوى الرئيسي للوحة */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* في حال كانت الأداة هي تحسينات البكسل */}
            {activeTool === 'adjust' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>PIXEL PROCESSING</span>
                  </h3>
                  <button 
                    onClick={() => setPixelValues({ brightness: 0, contrast: 0, saturation: 0, gamma: 1.0, threshold: 128 })}
                    className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>RESET</span>
                  </button>
                </div>

                {/* السطوع Brightness */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-sans">السطوع (Brightness)</span>
                    <span className="font-mono text-cyan-400 font-bold">{pixelValues.brightness}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={pixelValues.brightness}
                    onChange={(e) => setPixelValues({ ...pixelValues, brightness: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                  />
                  <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: g(x,y) = α·f(x,y) + β</span>
                </div>

                {/* التباين Contrast */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-sans">التباين (Contrast)</span>
                    <span className="font-mono text-cyan-400 font-bold">{pixelValues.contrast}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={pixelValues.contrast}
                    onChange={(e) => setPixelValues({ ...pixelValues, contrast: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                  />
                </div>

                {/* تصحيح جاما Gamma */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-sans">تصحيح جاما (Gamma Power)</span>
                    <span className="font-mono text-cyan-400 font-bold">{pixelValues.gamma}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="3.0" 
                    step="0.1"
                    value={pixelValues.gamma}
                    onChange={(e) => setPixelValues({ ...pixelValues, gamma: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                  />
                  <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: s = c · r^γ</span>
                </div>

                {/* أزرار تطبيق السطوع وجاما */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    disabled={!hasImage}
                    onClick={handleApplyBrightnessContrast}
                    className="py-2 px-2.5 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-950/40 text-[11px] font-bold rounded-xl border border-cyan-500/30 transition-all font-mono"
                  >
                    APPLY α & β
                  </button>
                  <button 
                    disabled={!hasImage}
                    onClick={handleApplyGamma}
                    className="py-2 px-2.5 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-950/40 text-[11px] font-bold rounded-xl border border-cyan-500/30 transition-all font-mono"
                  >
                    APPLY GAMMA
                  </button>
                </div>

                {/* أزرار العمليات المتقدمة للبكسل */}
                <div className="pt-2 space-y-2">
                  <button 
                    disabled={!hasImage}
                    onClick={() => onApplyDIP && onApplyDIP('histogram-equalization', { method: 'clahe', clip_limit: 2.0 })}
                    className="w-full py-2.5 px-3 bg-slate-900/90 hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 disabled:opacity-40 text-xs font-semibold rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-between transition-all glow-cyan-sm"
                  >
                    <span className="font-sans">معادلة الهستوجرام (CLAHE)</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button 
                    disabled={!hasImage}
                    onClick={() => onApplyDIP && onApplyDIP('invert')}
                    className="w-full py-2.5 px-3 bg-slate-900/90 hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 disabled:opacity-40 text-xs font-semibold rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-between transition-all"
                  >
                    <span className="font-sans">عكس الألوان (Negative 255 - I)</span>
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button 
                    disabled={!hasImage}
                    onClick={() => onApplyDIP && onApplyDIP('otsu')}
                    className="w-full py-2.5 px-3 bg-slate-900/90 hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 disabled:opacity-40 text-xs font-semibold rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-between transition-all"
                  >
                    <span className="font-sans">عتبة الأبيض والأسود (Otsu Threshold)</span>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      disabled={!hasImage}
                      onClick={() => onApplyDIP && onApplyDIP('grayscale')}
                      className="py-2.5 px-3 bg-slate-900/90 hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 disabled:opacity-40 text-xs font-semibold rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تدرج رمادي</span>
                    </button>
                    <button 
                      disabled={!hasImage}
                      onClick={() => onApplyDIP && onApplyDIP('sepia')}
                      className="py-2.5 px-3 bg-slate-900/90 hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 disabled:opacity-40 text-xs font-semibold rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>سيبيا (Sepia)</span>
                    </button>
                  </div>

                  {/* ================= التحسينات النقطية الأكاديمية الإضافية ================= */}
                  <div className="pt-3 border-t border-cyan-500/20 space-y-3">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                      العمليات النقطية المتقدمة (POINT OPS)
                    </span>

                    {/* 1. التحويل اللوغاريتمي */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">التحويل اللوغاريتمي (Log)</span>
                        <span className="font-mono text-cyan-400 text-[11px]">c = {logC}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="80" 
                        value={logC}
                        onChange={(e) => setLogC(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                      <button
                        disabled={!hasImage}
                        onClick={() => onApplyPointOp && onApplyPointOp('log', { c: logC })}
                        className="w-full py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-500/30 transition-all cursor-pointer"
                      >
                        تطبيق التحويل اللوغاريتمي
                      </button>
                    </div>

                    {/* 2. تمدد التباين Piecewise Linear */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">تمدد التباين (Contrast Stretch)</span>
                        <span className="font-mono text-cyan-400 text-[10px]">[{contrastPoints.r1}, {contrastPoints.r2}]</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <label className="text-slate-400 block mb-1">r1: {contrastPoints.r1}</label>
                          <input 
                            type="range" min="0" max="120" value={contrastPoints.r1}
                            onChange={(e) => setContrastPoints({ ...contrastPoints, r1: Number(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">r2: {contrastPoints.r2}</label>
                          <input 
                            type="range" min="130" max="255" value={contrastPoints.r2}
                            onChange={(e) => setContrastPoints({ ...contrastPoints, r2: Number(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                          />
                        </div>
                      </div>
                      <button
                        disabled={!hasImage}
                        onClick={() => onApplyPointOp && onApplyPointOp('contrast_stretch', contrastPoints)}
                        className="w-full py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                      >
                        تطبيق تمدد التباين
                      </button>
                    </div>

                    {/* 3. تقطيع المستويات البتية */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">تقطيع المستوى البتّي (Bit-Plane)</span>
                        <span className="font-mono text-cyan-400 text-[10px]">Bit {selectedBit}</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1 font-mono text-xs">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((b) => (
                          <button
                            key={b}
                            disabled={!hasImage}
                            onClick={() => {
                              setSelectedBit(b);
                              onApplyPointOp && onApplyPointOp('bitplane', { bit: b });
                            }}
                            className={`py-1.5 rounded font-bold transition-all cursor-pointer text-center ${
                              selectedBit === b 
                                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40' 
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                            title={`المستوى البتي ${b}`}
                          >
                            b{b}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. تسوية الهيستوغرام العالمية */}
                    <button
                      disabled={!hasImage}
                      onClick={() => onApplyPointOp && onApplyPointOp('histeq')}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600/30 via-cyan-500/30 to-transparent hover:bg-cyan-500/30 text-cyan-200 font-bold text-xs rounded-xl border border-cyan-400/40 flex items-center justify-between transition-all cursor-pointer shadow-md shadow-cyan-950/40"
                    >
                      <span>تسوية الهيستوغرام العالمية (Hist Eq)</span>
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* في حال كانت الأداة هي الفلاتر المكانية */}
            {activeTool === 'filters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-cyan-400" />
                    <span>SPATIAL FILTERS</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    2D CONV
                  </span>
                </div>

                {/* أزرار اختيار الفلتر النشط */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[10px] font-mono">
                  {[
                    { id: 'gaussian', label: 'Gaussian' },
                    { id: 'median', label: 'Median' },
                    { id: 'bilateral', label: 'Bilateral' },
                    { id: 'sobel', label: 'Sobel' },
                    { id: 'prewitt', label: 'Prewitt' },
                    { id: 'canny', label: 'Canny' },
                    { id: 'highboost', label: 'Highboost' },
                    { id: 'sharpen', label: 'Sharpen' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilterTab(f.id)}
                      className={`py-1.5 rounded-lg text-center transition-all ${
                        activeFilterTab === f.id
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                          : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* 1. معايير فلتر Gaussian Blur */}
                {activeFilterTab === 'gaussian' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">حجم النواة (Kernel Size)</span>
                        <span className="font-mono text-cyan-400 font-bold">{gaussianParams.ksize}×{gaussianParams.ksize}</span>
                      </div>
                      <input 
                        type="range" 
                        min="3" 
                        max="21" 
                        step="2"
                        value={gaussianParams.ksize}
                        onChange={(e) => setGaussianParams({ ...gaussianParams, ksize: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">الانحراف المعياري (Sigma σ)</span>
                        <span className="font-mono text-cyan-400 font-bold">{gaussianParams.sigma}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="10.0" 
                        step="0.5"
                        value={gaussianParams.sigma}
                        onChange={(e) => setGaussianParams({ ...gaussianParams, sigma: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: G(x,y) = (1/2πσ²)·e^(-(x²+y²)/2σ²)</span>
                  </div>
                )}

                {/* 2. معايير فلتر Median Blur */}
                {activeFilterTab === 'median' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">حجم نافذة الوسيط (Window Size)</span>
                        <span className="font-mono text-cyan-400 font-bold">{medianParams.ksize}×{medianParams.ksize}</span>
                      </div>
                      <input 
                        type="range" 
                        min="3" 
                        max="15" 
                        step="2"
                        value={medianParams.ksize}
                        onChange={(e) => setMedianParams({ ...medianParams, ksize: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 leading-relaxed font-sans block">
                      فلتر لاخطي مثالي لإزالة ضوضاء الملح والفلفل (Salt & Pepper) دون تلطيخ الحواف.
                    </span>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: g(x,y) = median &#123; f(s,t) &#125;</span>
                  </div>
                )}

                {/* 3. معايير فلتر Bilateral Filter */}
                {activeFilterTab === 'bilateral' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">قطر الجوار (Diameter d)</span>
                        <span className="font-mono text-cyan-400 font-bold">{bilateralParams.d} px</span>
                      </div>
                      <input 
                        type="range" 
                        min="3" 
                        max="19" 
                        step="2"
                        value={bilateralParams.d}
                        onChange={(e) => setBilateralParams({ ...bilateralParams, d: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">تباين الألوان (Sigma Color)</span>
                        <span className="font-mono text-cyan-400 font-bold">{bilateralParams.sigmaColor}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="150" 
                        step="5"
                        value={bilateralParams.sigmaColor}
                        onChange={(e) => setBilateralParams({ ...bilateralParams, sigmaColor: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">المدى المكاني (Sigma Space)</span>
                        <span className="font-mono text-cyan-400 font-bold">{bilateralParams.sigmaSpace}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="150" 
                        step="5"
                        value={bilateralParams.sigmaSpace}
                        onChange={(e) => setBilateralParams({ ...bilateralParams, sigmaSpace: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: Edge-Preserving Dual Gaussian</span>
                  </div>
                )}

                {/* 4. معايير كاشف سوبل Sobel Filter */}
                {activeFilterTab === 'sobel' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-300 font-sans block">اتجاه مشتقات التدرج:</span>
                      <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                        {[
                          { id: 'magnitude', label: 'Magnitude (كلي)' },
                          { id: 'x', label: 'Gx (رأسي)' },
                          { id: 'y', label: 'Gy (أفقي)' }
                        ].map(d => (
                          <button
                            key={d.id}
                            onClick={() => setSobelParams({ ...sobelParams, direction: d.id })}
                            className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                              sobelParams.direction === d.id
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">حجم النواة (Kernel Size)</span>
                        <span className="font-mono text-cyan-400 font-bold">{sobelParams.ksize}×{sobelParams.ksize}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="7" 
                        step="2"
                        value={sobelParams.ksize}
                        onChange={(e) => setSobelParams({ ...sobelParams, ksize: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: M(x,y) = √(Gx² + Gy²)</span>
                  </div>
                )}

                {/* 5. معايير كاشف بريويت Prewitt Detector */}
                {activeFilterTab === 'prewitt' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-300 font-sans block">اتجاه المشتقة التفاضلية:</span>
                      <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                        {[
                          { id: 'magnitude', label: 'Magnitude (كلي)' },
                          { id: 'x', label: 'Gx (رأسي)' },
                          { id: 'y', label: 'Gy (أفقي)' }
                        ].map(d => (
                          <button
                            key={d.id}
                            onClick={() => setPrewittDir(d.id)}
                            className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                              prewittDir === d.id
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[9.5px] text-slate-400 leading-relaxed font-sans block">
                      فلتر بريويت يستخدم مصفوفة 3×3 متساوية الأوزان لاشتقاق الحواف وحساب التدرج المكاني.
                    </span>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: G = √(Gx² + Gy²)</span>
                  </div>
                )}

                {/* 6. معايير كاشف كاني Canny Detector */}
                {activeFilterTab === 'canny' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">العتبة الدنيا (Lower Threshold)</span>
                        <span className="font-mono text-cyan-400 font-bold">{cannyParams.threshold1}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="255" 
                        value={cannyParams.threshold1}
                        onChange={(e) => setCannyParams({ ...cannyParams, threshold1: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">العتبة العليا (Upper Threshold)</span>
                        <span className="font-mono text-cyan-400 font-bold">{cannyParams.threshold2}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="255" 
                        value={cannyParams.threshold2}
                        onChange={(e) => setCannyParams({ ...cannyParams, threshold2: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: Hysteresis Thresholding & NMS</span>
                  </div>
                )}

                {/* 7. معايير التعزيز العالي Highboost Filtering */}
                {activeFilterTab === 'highboost' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">معامل التضخيم (Amplification Factor A)</span>
                        <span className="font-mono text-cyan-400 font-bold">A = {highboostA}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="3.0" 
                        step="0.1"
                        value={highboostA}
                        onChange={(e) => setHighboostA(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 leading-relaxed font-sans block">
                      عندما A = 1 يكافئ Unsharp Masking القياسي، وعند A &gt; 1 يضخم مكونات الصورة الأصلية بالإضافة للحواف الحادة.
                    </span>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: f_hb = A·f(x,y) - f_blur(x,y)</span>
                  </div>
                )}

                {/* 8. معايير زيادة الحدة Sharpening */}
                {activeFilterTab === 'sharpen' && (
                  <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-300 font-sans block">طريقة زيادة الحدة:</span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                        <button
                          onClick={() => setSharpenParams({ ...sharpenParams, method: 'unsharp' })}
                          className={`py-1.5 rounded-lg text-center transition-all ${
                            sharpenParams.method === 'unsharp'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          Unsharp Mask
                        </button>
                        <button
                          onClick={() => setSharpenParams({ ...sharpenParams, method: 'laplacian' })}
                          className={`py-1.5 rounded-lg text-center transition-all ${
                            sharpenParams.method === 'laplacian'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          Laplacian
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">شدة الحدة (Sharpen Amount)</span>
                        <span className="font-mono text-cyan-400 font-bold">{sharpenParams.amount}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" 
                        max="4.0" 
                        step="0.2"
                        value={sharpenParams.amount}
                        onChange={(e) => setSharpenParams({ ...sharpenParams, amount: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                    <span className="text-[9px] text-cyan-500/70 block font-mono">DIP: g(x,y) = f(x,y) + k·Detail(x,y)</span>
                  </div>
                )}

                {/* زر تطبيق الفلتر المكاني النشط */}
                <button
                  disabled={!hasImage}
                  onClick={handleApplyFilter}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>APPLY {activeFilterTab.toUpperCase()} FILTER</span>
                </button>
              </div>
            )}

            {/* مختبر الالتفاف والمجال الترددي (Kernel Playground + FFT Lab) */}
            {activeTool === 'lab' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>DIP LAB</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    {labSubTab === 'kernel' ? '3×3 MATRIX' : '2D FFT'}
                  </span>
                </div>

                {/* التبويب الداخلي: نواة الالتفاف / المجال الترددي */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[11px] font-mono">
                  <button
                    onClick={() => setLabSubTab('kernel')}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      labSubTab === 'kernel'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>مختبر الالتفاف</span>
                  </button>
                  <button
                    onClick={() => setLabSubTab('fft')}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      labSubTab === 'fft'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>المجال الترددي</span>
                  </button>
                </div>

                {labSubTab === 'kernel' && (
                <>
                {/* القوالب المسبقة الشهيرة */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-mono font-semibold block">PRESET MATRICES:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-sans">
                    {KERNEL_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectPreset(preset)}
                        className={`p-1.5 text-right rounded-lg border transition-all ${
                          activePreset === preset.name
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                            : 'bg-slate-950/70 border-cyan-500/15 text-slate-400 hover:text-slate-200 hover:border-cyan-500/30'
                        }`}
                      >
                        <div className="font-semibold font-mono truncate">{preset.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* شبكة إدخال مصفوفة 3x3 التفاعلية */}
                <div className="bg-slate-950/90 p-3 rounded-2xl border border-cyan-500/25 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pb-1 border-b border-cyan-500/10">
                    <span>WEIGHT MATRIX w(s, t)</span>
                    <span className="text-[10px] text-cyan-400">
                      SUM: {Number(matrixSum).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {customMatrix.map((row, rIdx) => 
                      row.map((cell, cIdx) => (
                        <input
                          key={`${rIdx}-${cIdx}`}
                          type="number"
                          step="any"
                          value={cell}
                          onChange={(e) => handleMatrixCellChange(rIdx, cIdx, e.target.value)}
                          className="w-full py-2 px-1 text-center font-mono text-xs font-bold bg-[#070a10] border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-xl text-cyan-200 transition-all shadow-inner"
                        />
                      ))
                    )}
                  </div>

                  {/* إعدادات التطبيع والإزاحة */}
                  <div className="pt-2 border-t border-cyan-500/10 space-y-2">
                    {/* التطبيع التلقائي */}
                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer select-none">
                      <span className="font-sans">تطبيع المعاملات تلقائياً (Normalize):</span>
                      <input 
                        type="checkbox" 
                        checked={normalize}
                        onChange={(e) => setNormalize(e.target.checked)}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>

                    {/* إزاحة السطوع Bias */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">قيمة الإزاحة (Bias Offset)</span>
                        <span className="font-mono text-cyan-400 font-bold">{bias}</span>
                      </div>
                      <input 
                        type="range" 
                        min="-128" 
                        max="255" 
                        value={bias}
                        onChange={(e) => setBias(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>

                {/* زر تطبيق مصفوفة الالتفاف المخصصة */}
                <button
                  disabled={!hasImage}
                  onClick={handleApplyCustomKernel}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
                >
                  <Cpu className="w-4 h-4" />
                  <span>RUN CONVOLUTION MATRIX</span>
                </button>
                </>
                )}

                {/* ============ التبويب الداخلي: المجال الترددي FFT ============ */}
                {labSubTab === 'fft' && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-gradient-to-tr from-blue-950/40 to-cyan-950/40 rounded-2xl border border-cyan-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs font-sans">
                        <Waves className="w-4 h-4 text-cyan-400" />
                        <span>المجال الترددي (Frequency Domain)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        F(u,v) = ΣΣ f(x,y)·e^(−j2π(ux/M+vy/N)) ثم طيف السعة 20·log(1+|F|)
                        والترشيح بضرب الطيف المتمركز في دالة الاستجابة H(u,v).
                      </p>
                    </div>

                    {/* زر عرض الطيف */}
                    <button
                      disabled={!hasImage || finalBusy}
                      onClick={handleShowSpectrum}
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-cyan-950/40 disabled:opacity-40 text-slate-200 hover:text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/25 transition-all flex items-center justify-center gap-2 font-mono"
                    >
                      {finalBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                      <span>SHOW MAGNITUDE SPECTRUM</span>
                    </button>

                    {/* نوع الفلتر */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      {[
                        { id: 'lowpass', label: 'Low-Pass (تنعيم)' },
                        { id: 'highpass', label: 'High-Pass (حدة)' }
                      ].map(ft => (
                        <button
                          key={ft.id}
                          onClick={() => setFftParams({ ...fftParams, filterType: ft.id })}
                          className={`py-1.5 rounded-lg text-center transition-all ${
                            fftParams.filterType === ft.id
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {ft.label}
                        </button>
                      ))}
                    </div>

                    {/* شكل دالة الاستجابة */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      {[
                        { id: 'ideal', label: 'Ideal (قطعي)' },
                        { id: 'gaussian', label: 'Gaussian (غاوسي)' }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setFftParams({ ...fftParams, profile: p.id })}
                          className={`py-1.5 rounded-lg text-center transition-all ${
                            fftParams.profile === p.id
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* تردد العزل D0 */}
                    <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">تردد العزل (Cutoff D₀)</span>
                        <span className="font-mono text-cyan-400 font-bold">{fftParams.cutoff} px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="200"
                        step="1"
                        value={fftParams.cutoff}
                        onChange={(e) => setFftParams({ ...fftParams, cutoff: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-[9px] text-cyan-500/70 block font-mono">
                        H = e^(−D²/2D₀²) — كلما صغر D₀ كان التنعيم أقوى
                      </span>
                    </div>

                    {/* زر الترشيح الترددي */}
                    <button
                      disabled={!hasImage || finalBusy}
                      onClick={handleApplyFreqFilter}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
                    >
                      {finalBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Waves className="w-4 h-4" />}
                      <span>APPLY FREQUENCY FILTER</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* التحويلات الهندسية التفاعلية (Geometric Transforms — Step 5) */}
            {activeTool === 'transform' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Crop className="w-4 h-4 text-cyan-400" />
                    <span>GEOMETRIC TRANSFORMS</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    AFFINE
                  </span>
                </div>

                {/* الدوران الرباعي */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-sans font-semibold block">الدوران بمضاعفات 90°:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      title="تدوير 90° مع عقارب الساعة"
                      disabled={!hasImage}
                      onClick={() => onRotateCW ? onRotateCW() : handleApplyTransform({ quarterTurns: (transformParams.quarterTurns + 3) % 4 })}
                      className="p-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 flex items-center justify-center transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      title="تدوير 90° عكس عقارب الساعة"
                      disabled={!hasImage}
                      onClick={() => onRotateCCW ? onRotateCCW() : handleApplyTransform({ quarterTurns: (transformParams.quarterTurns + 1) % 4 })}
                      className="p-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 flex items-center justify-center transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      title="تدوير 180°"
                      disabled={!hasImage}
                      onClick={() => onRotate180 ? onRotate180() : handleApplyTransform({ quarterTurns: 2 })}
                      className="py-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 text-[10px] font-mono font-bold transition-all"
                    >
                      180°
                    </button>
                    <button
                      title="تصفير الدوران"
                      disabled={!hasImage}
                      onClick={() => setTransformParams({ ...transformParams, quarterTurns: 0, freeAngle: 0 })}
                      className="py-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 text-[10px] font-mono font-bold transition-all"
                    >
                      RESET
                    </button>
                  </div>
                </div>

                {/* الزاوية الحرة */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-sans">الزاوية الحرة (Free Angle θ)</span>
                    <span className="font-mono text-cyan-400 font-bold">{transformParams.freeAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={transformParams.freeAngle}
                    onChange={(e) => setTransformParams({ ...transformParams, freeAngle: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <button
                    disabled={!hasImage || transformParams.freeAngle === 0}
                    onClick={() => onRotateFree ? onRotateFree(transformParams.freeAngle) : handleApplyTransform({ freeAngle: transformParams.freeAngle })}
                    className="w-full py-1.5 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 text-[11px] font-mono font-bold rounded-lg border border-cyan-500/30 transition-all disabled:opacity-40"
                  >
                    تطبيق زاوية {transformParams.freeAngle}°
                  </button>
                  <span className="text-[9px] text-cyan-500/70 block font-mono">
                    M = getRotationMatrix2D + warpAffine (Expand BBox)
                  </span>
                </div>

                {/* القلب */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-sans font-semibold block">القلب المرآتي (Flip):</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      disabled={!hasImage}
                      onClick={() => onFlip ? onFlip('h') : handleApplyTransform({ flip: 'h' })}
                      className="py-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 flex flex-col items-center gap-1 transition-all"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span className="text-[9px] font-mono">H</span>
                    </button>
                    <button
                      disabled={!hasImage}
                      onClick={() => onFlip ? onFlip('v') : handleApplyTransform({ flip: 'v' })}
                      className="py-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 flex flex-col items-center gap-1 transition-all"
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span className="text-[9px] font-mono">V</span>
                    </button>
                    <button
                      disabled={!hasImage}
                      onClick={() => onFlip ? onFlip('hv') : handleApplyTransform({ flip: 'hv' })}
                      className="py-2.5 bg-slate-900 hover:bg-cyan-950/50 disabled:opacity-40 text-slate-200 hover:text-cyan-300 rounded-xl border border-cyan-500/15 flex flex-col items-center gap-1 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-[9px] font-mono">H+V</span>
                    </button>
                  </div>
                </div>

                {/* القص بالنِسَب والمقابض التفاعلية */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-sans font-semibold block">نسبة أبعاد القص (Aspect Ratio):</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {((cropAspect || transformParams.aspect) === 'free' ? 'FREE CROP' : (cropAspect || transformParams.aspect)).toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                    {['free', '1:1', '16:9', '4:3', '9:16', '3:2'].map((ratio) => {
                      const isSelected = (cropAspect || transformParams.aspect) === ratio;
                      return (
                        <button
                          key={ratio}
                          onClick={() => {
                            if (setCropAspect) setCropAspect(ratio);
                            setTransformParams(prev => ({ ...prev, aspect: ratio }));
                          }}
                          className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold shadow-sm shadow-cyan-500/20'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-cyan-500/30'
                          }`}
                        >
                          {ratio === 'free' ? 'FREE' : ratio}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed font-sans flex items-start gap-2">
                    <Crop className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      يمكنك سحب أيّ من مقابض القص الـ 8 مباشرة على الصورة لتحديد أبعاد القص بحرية تامة.
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-sans">هامش قص إضافي (Inset Margin)</span>
                      <span className="font-mono text-cyan-400 font-bold">{cropInset ?? transformParams.cropInset}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={cropInset ?? transformParams.cropInset}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (setCropInset) setCropInset(val);
                        setTransformParams(prev => ({ ...prev, cropInset: val }));
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <button
                    disabled={!hasImage || finalBusy}
                    onClick={() => {
                      if (onCrop) {
                        onCrop(cropAspect || transformParams.aspect, cropInset ?? transformParams.cropInset);
                      } else {
                        handleApplyTransform();
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono"
                  >
                    {finalBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
                    <span>تطبيق القص المختار (APPLY CROP)</span>
                  </button>
                </div>
              </div>
            )}

            {/* في حال كانت الأداة هي عزل الخلفية والاستوديو الذكي (Step 4) */}
            {activeTool === 'bg-removal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>AI MATTING STUDIO</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    U-2-NET
                  </span>
                </div>

                {/* التبويب الداخلي: العزل الذكي / استوديو المنتجات */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-cyan-500/15 text-[11px] font-mono">
                  <button
                    onClick={() => setAiSubTab('removal')}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      aiSubTab === 'removal'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>إزالة الخلفية</span>
                  </button>
                  <button
                    onClick={() => setAiSubTab('studio')}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      aiSubTab === 'studio'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
                    }`}
                  >
                    <Frame className="w-3.5 h-3.5" />
                    <span>استوديو المنتجات</span>
                  </button>
                </div>

                {/* ============ التبويب الداخلي 1: العزل الذكي ============ */}
                {aiSubTab === 'removal' && (
                  <div className="space-y-3">
                    {/* زر العزل بنقرة واحدة */}
                    <div className="p-3.5 bg-gradient-to-tr from-cyan-950/40 to-blue-950/40 rounded-2xl border border-cyan-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs font-sans">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>العزل الذكي العصبي (U-2-Net)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        شبكة تشبع-تناقص عميقة تنتج قناع ألفا احتمالياً بدقة البكسل،
                        مع صقل إحصائي اختياري بـ GrabCut.
                      </p>
                      <button
                        disabled={!hasImage || aiBusy}
                        onClick={handleRemoveBackground}
                        className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-sans"
                      >
                        {aiBusy ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جارٍ العزل العصبي...</span>
                          </>
                        ) : (
                          <>
                            <MousePointerClick className="w-4 h-4" />
                            <span>عزل الخلفية بنقرة واحدة</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* اختيار النموذج العصبي */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400 font-mono font-semibold block">NEURAL MODEL:</span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[9.5px]">
                        {[
                          { id: 'u2netp', label: '⚡ توربو فائق (0.3s)' },
                          { id: 'u2net', label: 'U-2-Net قياسي' },
                          { id: 'isnet-general-use', label: 'ISNet أعلى دقة' },
                          { id: 'u2net_human_seg', label: 'U2Net بشر/بورتريه' }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setBgModel(m.id)}
                            className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                              bgModel === m.id
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold shadow-sm shadow-cyan-500/20'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* مقبض دقة صقل الحواف (Matting Threshold) */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-sans">دقة صقل الحواف (Matting Threshold)</span>
                        <span className="font-mono text-cyan-400 font-bold">{Number(mattingThreshold).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.9"
                        step="0.05"
                        value={mattingThreshold}
                        onChange={(e) => setMattingThreshold(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-[9px] text-cyan-500/70 block font-mono">
                        ALPHA' = clip((α/255 − t)/(1 − t)) — تنظف بقايا الهالة عند الزيادة
                      </span>
                    </div>

                    {/* خيار الصقل الإحصائي بـ GrabCut */}
                    <label className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15 cursor-pointer select-none">
                      <span className="font-sans">صقل الحواف إحصائياً (GrabCut GMM):</span>
                      <input
                        type="checkbox"
                        checked={grabcutRefine}
                        onChange={(e) => setGrabcutRefine(e.target.checked)}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>

                    {grabcutRefine && (
                      <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-sans">تكرارات GrabCut (Iterations)</span>
                          <span className="font-mono text-cyan-400 font-bold">{grabcutIter}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          step="1"
                          value={grabcutIter}
                          onChange={(e) => setGrabcutIter(Number(e.target.value))}
                          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {/* معاينة قناع الشفافية الحي (Alpha Mask Preview) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono font-semibold">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>ALPHA MASK PREVIEW</span>
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          alphaMask
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30'
                            : 'text-slate-500 border-slate-700 bg-slate-900/50'
                        }`}>
                          {alphaMask ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </div>
                      <div className="h-32 bg-[#060910] rounded-xl border border-cyan-500/20 overflow-hidden flex items-center justify-center relative">
                        {alphaMask ? (
                          <img src={alphaMask} alt="قناع الشفافية" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center space-y-1.5 p-3">
                            <Scissors className="w-6 h-6 text-slate-600 mx-auto" />
                            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                              سيظهر قناع الألفا هنا بعد أول عملية عزل
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ التبويب الداخلي 2: استوديو المنتجات ============ */}
                {aiSubTab === 'studio' && renderProductStudioControls()}
              </div>
            )}

            {/* معمل العمليات الحسابية ومزج الصور الرقمية (DIP Image Arithmetic & Blending Lab) */}
            {(activeTool === 'blend' || activeTool === 'arithmetic') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Combine className="w-4 h-4 text-cyan-400" />
                    <span>ARITHMETIC &amp; BLENDING LAB</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    DIP LAB
                  </span>
                </div>

                {/* كرت اختيار وتحميل الصورة الثانية B */}
                <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 font-sans">الصورة الثانية (Image B):</span>
                    {overlayImage && (
                      <button
                        onClick={() => setOverlayImage(null)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-mono transition-colors"
                      >
                        إلغاء الصورة ×
                      </button>
                    )}
                  </div>

                  {/* معاينة الصورتين A و B جنباً إلى جنب */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* الصورة الأساسية A */}
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/20 flex flex-col items-center">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold mb-1">IMAGE A (الأساسية)</span>
                      <div className="w-full h-16 rounded bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                        {hasImage ? (
                          <img src={currentImage} alt="Image A" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-slate-600 font-mono">NO IMAGE</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-1">{imageDimensions.width}×{imageDimensions.height}</span>
                    </div>

                    {/* الصورة الثانية B */}
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/20 flex flex-col items-center">
                      <span className="text-[10px] font-mono text-blue-400 font-bold mb-1">IMAGE B (المُدمجة)</span>
                      <div className="w-full h-16 rounded bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                        {overlayImage ? (
                          <img src={overlayImage} alt="Image B" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-slate-500 font-sans">غير محددة</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-1">{overlayImage ? 'جاهزة ✓' : 'مطلوبة'}</span>
                    </div>
                  </div>

                  {/* أزرار تحميل الصورة B واختيار العينات الجاهزة */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center justify-center gap-2 py-2 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 text-xs font-semibold rounded-xl border border-cyan-500/30 cursor-pointer transition-all font-sans">
                      <UploadCloud className="w-4 h-4" />
                      <span>{overlayImage ? 'تغيير الصورة الثانية B' : 'رفع صورة ثانية Image B'}</span>
                      <input type="file" accept="image/*" onChange={handleOverlayFileChange} className="hidden" />
                    </label>

                    {/* عينات تجريبية سريعة */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setOverlayImage('/sample-pattern.png')}
                        className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded-lg text-[9.5px] font-sans border border-slate-800 transition-all text-center"
                      >
                        نمط هندسي DIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayImage('/sample-product.png')}
                        className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded-lg text-[9.5px] font-sans border border-slate-800 transition-all text-center"
                      >
                        منتج ساعة 3D
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayImage('/test-pose.jpg')}
                        className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded-lg text-[9.5px] font-sans border border-slate-800 transition-all text-center"
                      >
                        بورتريه شخصي
                      </button>
                    </div>
                  </div>
                </div>

                {/* اختيار العملية الحسابية الأكاديمية */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-mono font-semibold block">DIP ARITHMETIC OPERATION:</span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                    {[
                      { id: 'subtract', sym: '|A - B|', name: 'طرح صورتين', desc: 'كشف الحركة والتغيرات' },
                      { id: 'add', sym: '(A + B) / 2', name: 'جمع متوسط', desc: 'تخفيف الضوضاء' },
                      { id: 'add_saturated', sym: 'A + B', name: 'جمع تشبعي', desc: 'زيادة السطوع الكلي' },
                      { id: 'multiply', sym: 'A × B / 255', name: 'ضرب مصفوفي', desc: 'تطبيق أقنعة وعزل ROI' },
                      { id: 'divide', sym: 'A / (B + 1)', name: 'قسمة صور', desc: 'تصحيح تدرج الإضاءة' },
                      { id: 'blend', sym: '(1-α)A + αB', name: 'مزج خطي بأوزان', desc: 'دمج تدريجي مع تحكم α' },
                      { id: 'screen', sym: 'Screen', name: 'مزج الشاشة', desc: 'تفتيح ناعم مركب' },
                      { id: 'difference', sym: 'Difference', name: 'الفرق المطلق', desc: 'إبراز التباين الكامل' },
                      { id: 'max', sym: 'max(A, B)', name: 'القيمة العظمى', desc: 'دمج المناطق الساطعة' },
                      { id: 'min', sym: 'min(A, B)', name: 'القيمة الصغرى', desc: 'دمج المناطق الداكنة' }
                    ].map((op) => {
                      const isSel = arithmeticParams.operation === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setArithmeticParams({ ...arithmeticParams, operation: op.id })}
                          className={`p-2 rounded-xl text-right transition-all border ${
                            isSel
                              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-md shadow-cyan-950/40'
                              : 'bg-slate-950/60 text-slate-400 border-cyan-500/10 hover:bg-cyan-950/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-cyan-400 mb-0.5">
                            <span>{op.sym}</span>
                            {isSel && <span className="text-[9px] text-cyan-300">●</span>}
                          </div>
                          <span className="block font-sans font-semibold text-slate-200 text-[11px] truncate">{op.name}</span>
                          <span className="block text-[9px] text-slate-400 opacity-80 font-sans truncate">{op.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* شريط تحكم ألفا (Alpha Blending Slider) عند اختيار المزج الخطي */}
                {arithmeticParams.operation === 'blend' && (
                  <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-sans">وزن المزج (Alpha Weight α):</span>
                      <span className="font-mono text-cyan-400 font-bold">{Math.round(arithmeticParams.alpha * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={arithmeticParams.alpha}
                      onChange={(e) => setArithmeticParams({ ...arithmeticParams, alpha: Number(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Image A: {Math.round((1 - arithmeticParams.alpha) * 100)}%</span>
                      <span>Image B: {Math.round(arithmeticParams.alpha * 100)}%</span>
                    </div>
                  </div>
                )}

                {/* بطاقة المعادلة الرياضية والغرض الأكاديمي (DIP Academic Principle Card) */}
                <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-500/20 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-cyan-400">
                    <span>ACADEMIC FORMULA</span>
                    <span className="text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">MATHEMATICAL MODEL</span>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-lg font-mono text-cyan-300 text-center text-xs border border-slate-800">
                    {arithmeticParams.operation === 'subtract' && 'g(x, y) = |f₁(x, y) − f₂(x, y)|'}
                    {arithmeticParams.operation === 'add' && 'g(x, y) = [f₁(x, y) + f₂(x, y)] / 2'}
                    {arithmeticParams.operation === 'add_saturated' && 'g(x, y) = min(255, f₁(x, y) + f₂(x, y))'}
                    {arithmeticParams.operation === 'multiply' && 'g(x, y) = [f₁(x, y) · f₂(x, y)] / 255'}
                    {arithmeticParams.operation === 'divide' && 'g(x, y) = [f₁(x, y) / max(1, f₂(x, y))] · 128'}
                    {arithmeticParams.operation === 'blend' && `g(x, y) = (1 − ${arithmeticParams.alpha.toFixed(2)})·f₁ + ${arithmeticParams.alpha.toFixed(2)}·f₂`}
                    {arithmeticParams.operation === 'screen' && 'g(x, y) = 255 − [(255 − f₁)·(255 − f₂)] / 255'}
                    {arithmeticParams.operation === 'difference' && 'g(x, y) = |f₁(x, y) − f₂(x, y)|'}
                    {arithmeticParams.operation === 'max' && 'g(x, y) = max(f₁(x, y), f₂(x, y))'}
                    {arithmeticParams.operation === 'min' && 'g(x, y) = min(f₁(x, y), f₂(x, y))'}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans pt-0.5">
                    {arithmeticParams.operation === 'subtract' && 'الهدف: كشف التغيرات والتحولات الزمنية، مراقبة الحركة، وإلغاء الخلفية الثابتة.'}
                    {arithmeticParams.operation === 'add' && 'الهدف: تقليل الضوضاء العشوائية غير المترابطة بمقدار الجذر التربيعي للعينات (Noise Averaging).'}
                    {arithmeticParams.operation === 'add_saturated' && 'الهدف: زيادة الإضاءة التراكمية ودمج الإشارات البصرية الساطعة.'}
                    {arithmeticParams.operation === 'multiply' && 'الهدف: تطبيق الأقنعة المكانية وعزل منطقة الاهتمام (ROI Masking) وتعديل التباين.'}
                    {arithmeticParams.operation === 'divide' && 'الهدف: تصحيح تدرج الإضاءة غير المتجانس (Shading Correction) وتحليل النسب الطيفية.'}
                    {arithmeticParams.operation === 'blend' && 'الهدف: المزج الخطي التدريجي بأوزان متغيرة والمحاكاة التدرجية للانتقال البصري.'}
                    {arithmeticParams.operation === 'screen' && 'الهدف: المزج العاكس المضاعف لتفتيح المشاهد ودمج المؤثرات الضوئية.'}
                    {arithmeticParams.operation === 'difference' && 'الهدف: إبراز الفروقات الكلية بين الصورتين بدقة بكسلية مطلقة.'}
                    {arithmeticParams.operation === 'max' && 'الهدف: اختيار البكسل الأشد سطوعاً من كلا الصورتين لدمج التأثيرات المضيئة.'}
                    {arithmeticParams.operation === 'min' && 'الهدف: اختيار البكسل الأكثر عتامة لدمج الظلال والتفاصيل الداكنة.'}
                  </p>
                </div>

                {/* زر تطبيق العملية الحسابية */}
                <button
                  disabled={!hasImage || finalBusy || !overlayImage}
                  onClick={handleApplyArithmeticOp}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 font-mono cursor-pointer active:scale-98"
                >
                  {finalBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Combine className="w-4 h-4" />}
                  <span>{overlayImage ? 'EXECUTE ARITHMETIC OP' : 'يرجى تحديد الصورة B أولاً'}</span>
                </button>

                {/* رسالة التغذية الراجعة بعد التنفيذ */}
                {arithmeticFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-sans transition-all animate-fade-in ${
                    arithmeticFeedback.success 
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                  }`}>
                    <span className="text-sm shrink-0">{arithmeticFeedback.success ? '✓' : '⚠'}</span>
                    <span className="leading-tight">{arithmeticFeedback.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* استوديو الرسم والتوضيحات الحية (Drawing & Annotations Studio) */}
            {activeTool === 'draw' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/10">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-cyan-400" />
                    <span>DRAWING & ANNOTATIONS</span>
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    VECTOR/RASTER
                  </span>
                </div>

                {/* شريط اختيار أداة الرسم */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-sans font-semibold block">أداة الرسم والتوضيح:</span>
                  <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                    {[
                      { id: 'brush', label: 'فرشاة', icon: PenTool },
                      { id: 'eraser', label: 'ممحاة', icon: Eraser },
                      { id: 'line', label: 'خط', icon: SlidersHorizontal },
                      { id: 'arrow', label: 'سهم', icon: MoveRight },
                      { id: 'rect', label: 'مستطيل', icon: Square },
                      { id: 'circle', label: 'دائرة', icon: Circle },
                      { id: 'text', label: 'نص', icon: Type },
                    ].map((toolItem) => {
                      const Icon = toolItem.icon;
                      const isSelected = (drawParams?.tool || 'brush') === toolItem.id;
                      return (
                        <button
                          key={toolItem.id}
                          onClick={() => setDrawParams && setDrawParams(prev => ({ ...prev, tool: toolItem.id }))}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-bold shadow-md shadow-cyan-500/20'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-cyan-500/30'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[9.5px] font-sans">{toolItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* لوحة الألوان */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-sans">لون الرسم (Stroke Color)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold uppercase text-[11px]">{drawParams?.color || '#06b6d4'}</span>
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: drawParams?.color || '#06b6d4' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawParams && setDrawParams(prev => ({ ...prev, color: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          drawParams?.color === c ? 'border-cyan-400 scale-110 shadow-md shadow-cyan-500/50' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <label className="relative cursor-pointer ml-auto" title="لون مخصص">
                      <input
                        type="color"
                        value={drawParams?.color || '#06b6d4'}
                        onChange={(e) => setDrawParams && setDrawParams(prev => ({ ...prev, color: e.target.value }))}
                        className="w-6 h-6 rounded-full opacity-0 absolute inset-0 cursor-pointer"
                      />
                      <div className="w-6 h-6 rounded-full border border-dashed border-cyan-400 flex items-center justify-center text-[10px] text-cyan-300 bg-cyan-950/40">
                        +
                      </div>
                    </label>
                  </div>
                </div>

                {/* سمك الخط والشفافية */}
                <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-sans">سُمك الخط (Stroke Width)</span>
                      <span className="font-mono text-cyan-400 font-bold">{drawParams?.size || 6}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="1"
                      value={drawParams?.size || 6}
                      onChange={(e) => setDrawParams && setDrawParams(prev => ({ ...prev, size: Number(e.target.value) }))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 pt-1 border-t border-cyan-500/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-sans">الشفافية (Opacity)</span>
                      <span className="font-mono text-cyan-400 font-bold">{Math.round((drawParams?.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={drawParams?.opacity ?? 1}
                      onChange={(e) => setDrawParams && setDrawParams(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* أزرار العمليات: تراجع، مسح، دمج وحفظ في الصورة */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onTriggerDrawAction && onTriggerDrawAction('undo')}
                      className="py-2 px-3 bg-slate-900 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 rounded-xl text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>تراجع خطوة</span>
                    </button>
                    <button
                      onClick={() => onTriggerDrawAction && onTriggerDrawAction('clear')}
                      className="py-2 px-3 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 rounded-xl text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل</span>
                    </button>
                  </div>

                  <button
                    disabled={!hasImage}
                    onClick={() => onTriggerDrawAction && onTriggerDrawAction('save')}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-sans"
                  >
                    <Check className="w-4 h-4" />
                    <span>دمج وحفظ الرسم في الصورة الحالية</span>
                  </button>
                </div>
              </div>
            )}

            {/* استوديو المنتجات ثلاثي الأبعاد المباشر (3D Product Studio — Mockup Tool) */}
            {activeTool === 'mockup' && renderProductStudioControls()}

            {/* تجزئة وعزل الألوان (Segmentation & Clustering) */}
            {activeTool === 'segmentation' && renderSegmentationControls()}

            {/* معمل الضوضاء والترميم (Noise & Restoration Lab + Live PSNR) */}
            {activeTool === 'restoration' && renderRestorationControls()}

            {/* المعالجة المورفولوجية (Morphological Operations) */}
            {activeTool === 'morphology' && renderMorphologyControls()}

            {/* الرؤية الحرارية والطيفية (Thermal & False-Color LUTs) */}
            {activeTool === 'thermal-lut' && renderThermalLUTControls()}

            {/* تشفير وإخفاء البيانات (LSB Steganography) */}
            {activeTool === 'stego' && renderStegoControls()}

            {/* أدوات أخرى */}
            {!['adjust', 'filters', 'lab', 'transform', 'bg-removal', 'blend', 'draw', 'mockup', 'segmentation', 'restoration', 'morphology', 'thermal-lut', 'stego'].includes(activeTool) && (
              <div className="p-8 text-center text-slate-400 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 mx-auto flex items-center justify-center text-cyan-400">
                  <Palette className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-mono font-bold text-slate-200">TOOL MODULE READY</h4>
                <p className="text-[11px] text-slate-400 font-sans">
                  سيتم تفعيل بقية خيارات هذه الأداة في الخطوة البرمجية القادمة.
                </p>
              </div>
            )}

            {/* التصدير النهائي (Collapsible Final Export) */}
            <div className="pt-2 border-t border-cyan-500/10">
              <button
                type="button"
                onClick={() => setIsExportExpanded(!isExportExpanded)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-cyan-950/30 border border-cyan-500/15 transition-all text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>FINAL EXPORT ({exportParams.format.toUpperCase()})</span>
                </span>
                <span className="text-[10px] text-cyan-400/80 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20 font-sans">
                  {isExportExpanded ? 'إخفاء ▲' : 'خيارات التصدير ▼'}
                </span>
              </button>

              {isExportExpanded && (
                <div className="space-y-3 mt-2.5">
                  {/* صيغ التصدير */}
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    {[
                      { id: 'png', label: 'PNG', hint: 'Lossless' },
                      { id: 'jpeg', label: 'JPEG', hint: 'Q-Control' },
                      { id: 'webp', label: 'WebP', hint: 'Compact' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setExportParams({ ...exportParams, format: f.id })}
                        className={`py-2 rounded-xl border text-center transition-all ${
                          exportParams.format === f.id
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-cyan-500/30'
                        }`}
                      >
                        <span className="block font-bold">{f.label}</span>
                        <span className="block text-[8.5px] opacity-70 font-sans">{f.hint}</span>
                      </button>
                    ))}
                  </div>

                  {/* جودة الترميز */}
                  <div className={`space-y-1 bg-slate-950/60 p-3 rounded-xl border border-cyan-500/15 ${exportParams.format === 'png' ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-sans">جودة التصدير (Quality)</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {exportParams.format === 'png' ? 'MAX (Lossless)' : `${exportParams.quality}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      disabled={exportParams.format === 'png'}
                      value={exportParams.quality}
                      onChange={(e) => setExportParams({ ...exportParams, quality: Number(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>

                  <button
                    disabled={!hasImage || finalBusy}
                    onClick={handleExport}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-mono"
                  >
                    {finalBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>EXPORT &amp; DOWNLOAD FILE</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* تبويب بيانات وتيليمتري الصورة والهستوجرام */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-cyan-500/10">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>IMAGE TELEMETRY</span>
            </h3>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-cyan-500/20 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">RESOLUTION:</span>
                <span className="text-cyan-300 font-bold">{imageDimensions.width} × {imageDimensions.height} px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">COLOR DEPTH:</span>
                <span className="text-emerald-400 font-semibold">24-bit (8-bit/channel)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">COLOR SPACE:</span>
                <span className="text-cyan-300">sRGB / CIE-XYZ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CHANNELS:</span>
                <span className="text-slate-200">Red, Green, Blue</span>
              </div>
            </div>

            {/* رسم بياني حي للهستوجرام (Live Histogram) مستقبل من محرك المعالجة */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono font-semibold">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>HISTOGRAM DENSITY</span>
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  liveHistogram
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30'
                    : 'text-slate-500 border-slate-700 bg-slate-900/50'
                }`}>
                  {liveHistogram ? 'LIVE 32-BINS' : 'IDLE'}
                </span>
              </div>

              <div className="h-28 bg-[#060910] rounded-xl border border-cyan-500/20 p-2.5 flex items-end gap-[2px] overflow-hidden relative shadow-inner">
                {/* خط متوسط الشدة */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/30 border-dashed" />

                {liveHistogram ? (
                  /* القنوات الحية R/G/B متراكبة بتدرجات شفافة */
                  (liveHistogram.r || []).map((_, i) => {
                    const rVal = liveHistogram.r?.[i] ?? 0;
                    const gVal = liveHistogram.g?.[i] ?? 0;
                    const bVal = liveHistogram.b?.[i] ?? 0;
                    const grayVal = liveHistogram.gray?.[i] ?? Math.round((rVal + gVal + bVal) / 3);
                    return (
                      <div
                        key={i}
                        className="flex-1 relative rounded-t-sm transition-all duration-300"
                        style={{ height: '100%' }}
                      >
                        <div
                          style={{ height: `${Math.max(2, grayVal)}%` }}
                          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-cyan-900/60 via-cyan-500/50 to-cyan-300/70 rounded-t-sm"
                        />
                        <div
                          style={{ height: `${Math.max(2, rVal)}%` }}
                          className="absolute bottom-0 inset-x-0 bg-rose-500/40 rounded-t-sm"
                        />
                        <div
                          style={{ height: `${Math.max(2, gVal)}%` }}
                          className="absolute bottom-0 inset-x-0 bg-emerald-500/35 rounded-t-sm"
                        />
                        <div
                          style={{ height: `${Math.max(2, bVal)}%` }}
                          className="absolute bottom-0 inset-x-0 bg-blue-500/35 rounded-t-sm"
                        />
                      </div>
                    );
                  })
                ) : (
                  /* حالة الخمول: مكان محجوز بأنيميشن خافت */
                  Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      style={{ height: `${12 + 8 * Math.abs(Math.sin(i / 3))}%` }}
                      className="flex-1 bg-slate-800/70 rounded-t-sm"
                    />
                  ))
                )}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
                <span>0 (BLACK)</span>
                <span>128 (MID)</span>
                <span>255 (WHITE)</span>
              </div>

              {/* بطاقة معلومات المعالجة الأكاديمية (DIP Processing Info HUD) */}
              <div className="space-y-2 pt-2 border-t border-cyan-500/15">
                <div className="flex items-center justify-between text-xs text-slate-300 font-mono font-semibold">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>PROCESSING INFO HUD</span>
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    ACADEMIC TELEMETRY
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 space-y-2.5 text-[11px] font-mono">
                  {/* 1. Input */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>INPUT:</span>
                    </div>
                    <div className="text-slate-200 pr-2.5 font-sans mt-0.5">
                      {processingInfo?.input || `${imageDimensions.width}×${imageDimensions.height} px • sRGB 24-bit`}
                    </div>
                  </div>

                  {/* 2. Preprocessing */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span>PREPROCESSING:</span>
                    </div>
                    <div className="text-teal-300 pr-2.5 font-sans mt-0.5">
                      {processingInfo?.preprocessing || 'None (Direct Raster Buffer)'}
                    </div>
                  </div>

                  {/* 3. Parameters */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>PARAMETERS:</span>
                    </div>
                    <div className="text-cyan-300 pr-2.5 font-sans mt-0.5">
                      {processingInfo?.parameters || 'Baseline Viewport Mode'}
                    </div>
                  </div>

                  {/* 4. Output & Latency */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>OUTPUT &amp; LATENCY:</span>
                    </div>
                    <div className="text-emerald-300 pr-2.5 font-sans mt-0.5 flex items-center justify-between">
                      <span>{processingInfo?.output || lastOperation?.message || 'Rendered on HTML5 Canvas'}</span>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {lastOperation?.latency || '0.4ms'}
                      </span>
                    </div>
                  </div>

                  {/* 5. DIP Academic Principle */}
                  <div className="pt-2 border-t border-cyan-500/15">
                    <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      <span>DIP PRINCIPLE (المبدأ الأكاديمي):</span>
                    </div>
                    <p className="text-slate-300 pr-2.5 font-sans leading-relaxed text-[10.5px] mt-1">
                      {processingInfo?.principle || 'معالجة الصور في النطاق المكاني (Spatial Domain) بالوصول المباشر لمصفوفة البكسلات ثنائية الأبعاد f(x, y).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* تذييل لوحة التحكم */}
      <div className="p-3 border-t border-cyan-500/10 bg-[#080b12]/80 text-center font-mono">
        <span className="text-[10px] text-slate-500 tracking-wider">
          PIXELMATRIX • HUD INSPECTOR
        </span>
      </div>
    </aside>
  );
}
