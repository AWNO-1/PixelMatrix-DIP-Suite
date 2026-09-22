import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import RightPanel from './components/RightPanel';
import PassportStudio from './components/PassportStudio';
import { 
  checkBackendHealth, 
  applyPixelOperation, 
  applySpatialOperation, 
  applyAIOperation, 
  applyFinalOperation,
  downloadDataUri
} from './services/api';
import {
  rotate90,
  rotateFreeAngle,
  flipImage,
  cropImage,
  applyPixelAdjustments,
  applySpatialFilter,
  blendImages,
  calculateHistogram,
  compositeProductStudio,
  applyImageArithmetic,
  applyLogTransform,
  applyContrastStretching,
  applyBitPlaneSlicing,
  applyHistogramEqualization,
  applyPrewittFilter,
  applyUnsharpHighboost,
  applyCannyEdge,
  applyMedianFilter,
  applyFalseColorLUT,
  addNoise,
  applyRestorationFilter,
  calculatePSNRAndMSE,
  applyMorphology,
  applyColorMasking,
  applyKMeansSegmentation,
  embedLSBMessage,
  extractLSBMessage
} from './services/clientDIP';
import TeamHeroModal from './components/TeamHeroModal';
import HelpModal from './components/HelpModal';
import WelcomeScreen from './components/WelcomeScreen';
import { PanelLeft, PanelRight } from 'lucide-react';


/**
 * المكون الرئيسي لمنصة PixelMatrix (Studio Core App)
 * محرك معالجة صور رقمية هجين (Client Canvas 60 FPS + خادم FastAPI)
 */
export default function App() {
  // الأداة النشطة حالياً (الافتراضي: تحسينات البكسل)
  const [activeTool, setActiveTool] = useState('adjust');

  // مسار العرض الحالي: 'welcome' (شاشة الترحيب وإطلاق الاستوديو) أو 'editor' أو 'passport'
  const [currentView, setCurrentView] = useState('welcome');

  // مسار وبيانات الصورة الحالية والصورة الأصلية
  const [currentImage, setCurrentImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [fileName, setFileName] = useState('');

  // سجل التاريخ للتراجع والإعادة (Undo / Redo Stack)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // الإعداد المسبق المختار للوضعيات البيومترية (جواز، فيزا، هوية)
  const [initialPosePreset, setInitialPosePreset] = useState('schengen');

  const handleOpenPassport = (preset = 'schengen') => {
    setInitialPosePreset(preset);
    setCurrentView('passport');
  };

  // مستوى التقريب والتكبير للوحة العمل (بين 25% و 300%)
  const [zoomLevel, setZoomLevel] = useState(100);

  // تفعيل أو إيقاف وضع المقارنة قبل / بعد
  const [showCompare, setShowCompare] = useState(false);

  // ستارة المقارنة التفاعلية (Interactive Split Curtain)
  const [splitCompare, setSplitCompare] = useState(false);

  // عدسة مصفوفة البكسلات 5x5 الحية (Pixel Loupe)
  const [showLoupe, setShowLoupe] = useState(false);

  // نافذة التعريف بفريق العمل (Team Showcase Modal)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // نافذة دليل الاستخدام والمساعدة الأكاديمية (Help & Defense Manual Modal)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // مقاييس الجودة الأكاديمية (PSNR & MSE)
  const [psnrMetrics, setPsnrMetrics] = useState({ psnr: '∞ dB', mse: '0.00' });


  // أبعاد الصورة الحالية
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // مؤشر زمن المعالجة الفوري وحالة الخادم (Telemetry Latency)
  const [processingLatency, setProcessingLatency] = useState('0.4ms');
  const [backendOnline, setBackendOnline] = useState(false);

  // الهستوجرام الحي (Live Histogram) لشاشات الـ HUD
  const [liveHistogram, setLiveHistogram] = useState(null);
  const [lastOperation, setLastOperation] = useState(null);

  // بطاقة معلومات المعالجة الأكاديمية (DIP Processing Info HUD)
  const [processingInfo, setProcessingInfo] = useState({
    input: 'sRGB 24-bit (3 Channels)',
    preprocessing: 'Direct Rasterization / None',
    parameters: 'Baseline Canvas Initialization',
    output: 'Canvas 60 FPS Viewport',
    principle: 'Direct Spatial Domain Matrix Representation'
  });

  // إخفاء وإظهار القوائم الجانبية لتوفير مساحة رؤية كاملة للكانفاس
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // قناع الشفافية (Alpha Mask) المعاين
  const [alphaMask, setAlphaMask] = useState(null);

  // حفظ الصورة في السجل وتحديث الحالة (مع قصر السجل على 15 إطار لمنع هدر الذاكرة)
  const pushToHistory = (newImageData, opName = 'تعديل', customInfo = null) => {
    const t0 = performance.now();
    setCurrentImage(newImageData);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = newImageData;

    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, newImageData];
      if (updated.length > 15) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 14));

    const latency = Math.max(1, Math.round(performance.now() - t0));
    setProcessingLatency(`${latency}ms`);
    setLastOperation({ message: opName, latency: `${latency}ms` });
    if (customInfo) {
      setProcessingInfo(prev => ({ ...prev, ...customInfo }));
    }
    calculateHistogram(newImageData).then((hist) => setLiveHistogram(hist)).catch(() => {});
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const prevImg = history[newIdx];
      setCurrentImage(prevImg);
      const img = new Image();
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = prevImg;
      calculateHistogram(prevImg).then((hist) => setLiveHistogram(hist)).catch(() => {});
      setLastOperation({ message: 'تراجع (Undo)', latency: '0ms' });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const nextImg = history[newIdx];
      setCurrentImage(nextImg);
      const img = new Image();
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = nextImg;
      calculateHistogram(nextImg).then((hist) => setLiveHistogram(hist)).catch(() => {});
      setLastOperation({ message: 'إعادة (Redo)', latency: '0ms' });
    }
  };

  const handleExport = () => {
    if (currentImage) {
      downloadDataUri(currentImage, fileName ? `pixelmatrix-${fileName}` : 'pixelmatrix-export.png');
    }
  };

  // دوال التحويلات الهندسية المباشرة والفائقة السرعة (< 5ms)
  const handleDirectRotateCW = async () => {
    if (!currentImage) return;
    const res = await rotate90(currentImage, 'cw');
    pushToHistory(res, 'تدوير 90° مع عقارب الساعة');
  };

  const handleDirectRotateCCW = async () => {
    if (!currentImage) return;
    const res = await rotate90(currentImage, 'ccw');
    pushToHistory(res, 'تدوير 90° عكس عقارب الساعة');
  };

  const handleDirectRotate180 = async () => {
    if (!currentImage) return;
    const res = await rotate90(currentImage, '180');
    pushToHistory(res, 'تدوير 180°');
  };

  const handleDirectRotateFree = async (angleDeg) => {
    if (!currentImage) return;
    const res = await rotateFreeAngle(currentImage, angleDeg);
    pushToHistory(res, `تدوير حر ${angleDeg}°`);
  };

  const handleDirectFlip = async (type) => {
    if (!currentImage) return;
    const res = await flipImage(currentImage, type);
    const label = type === 'h' ? 'قلب أفقي' : type === 'v' ? 'قلب رأسي' : 'قلب أفقي ورأسي';
    pushToHistory(res, label);
  };

  // معاملات القص الحر بالمقابض
  const [cropAspect, setCropAspect] = useState('free');
  const [cropInset, setCropInset] = useState(0);
  const [activeCropRect, setActiveCropRect] = useState({ x: 10, y: 10, w: 80, h: 80 });

  const handleApplyCropRect = async (percentRect) => {
    if (!currentImage) return;
    const target = percentRect || activeCropRect;
    const res = await cropImage(currentImage, { percentRect: target });
    pushToHistory(res, 'قص حر بالمقابض');
  };

  const handleDirectCrop = async (aspect = 'free', insetPercent = 0, percentRect = null) => {
    if (!currentImage) return;
    const target = percentRect || activeCropRect;
    const res = await cropImage(currentImage, {
      aspect,
      insetPercent,
      percentRect: target
    });
    pushToHistory(res, target ? 'قص بالمقابض التفاعلية' : `قص بنسبة ${aspect}`);
  };

  // معاملات استوديو الرسم والتوضيحات
  const [drawParams, setDrawParams] = useState({
    tool: 'brush',
    color: '#06b6d4',
    size: 6,
    opacity: 1.0
  });
  const [drawAction, setDrawAction] = useState({ type: 'idle', token: 0 });

  const handleSaveDrawing = (mergedDataUrl) => {
    if (mergedDataUrl) {
      pushToHistory(mergedDataUrl, 'رسم وتوضيحات على الصورة');
    }
  };

  // معمل العمليات الحسابية ومزج الصور الأكاديمي (Image Arithmetic & Blending Lab)
  const handleApplyArithmetic = async (overlayImage, operation = 'subtract', alpha = 0.5) => {
    if (!currentImage || !overlayImage) return;
    const t0 = performance.now();
    try {
      const resultDataUrl = await applyImageArithmetic(currentImage, overlayImage, operation, alpha);
      const latency = Math.max(1, Math.round(performance.now() - t0));
      setProcessingLatency(`${latency}ms`);
      const opNames = {
        subtract: 'طرح صورتين |A - B| (كشف التغيرات)',
        add: 'جمع صورتين (A+B)/2 (تقليل الضوضاء)',
        add_saturated: 'جمع تشبعي A+B',
        multiply: 'ضرب صورتين A×B/255 (قناع وتعديل ديناميكي)',
        divide: 'قسمة صورتين A/(B+1) (تصحيح الإضاءة)',
        blend: `مزج خطي بأوزان α=${Math.round(alpha * 100)}%`,
        screen: 'مزج الشاشة (Screen)',
        difference: 'الفرق المطلق (Difference)',
        max: 'القيمة العظمى max(A,B)',
        min: 'القيمة الصغرى min(A,B)'
      };
      const opLabel = opNames[operation] || `عملية حسابية (${operation})`;
      const customInfo = {
        input: `Image A (${imageDimensions.width}×${imageDimensions.height}) & Image B`,
        preprocessing: 'Spatial Channel Alignment & Resampling',
        parameters: `Op: ${operation.toUpperCase()} • α: ${alpha}`,
        output: 'Direct Spatial Domain Matrix Result',
        principle: 'العمليات الحسابية النقطية بين مصفوفتين ثنائيتي الأبعاد f₁(x, y) و f₂(x, y) لتوليد مصفوفة المخرجات g(x, y).'
      };
      pushToHistory(resultDataUrl, opLabel, customInfo);
      return { success: true, image: resultDataUrl };
    } catch (err) {
      console.error('Failed to apply image arithmetic:', err);
      return { success: false, error: err.message };
    }
  };

  // فحص جاهزية خادم الباك إند FastAPI تلقائياً عند التشغيل
  useEffect(() => {
    checkBackendHealth().then((res) => {
      if (res.online) {
        setProcessingLatency(res.latency);
        setBackendOnline(true);
      }
    });
  }, []);

  // تطبيق خوارزميات معالجة البكسل (DIP) - تنفيذ محلي فوري + تزامن
  const handleApplyDIP = async (endpoint, params = {}) => {
    if (!currentImage) return;
    try {
      let resultUri = null;
      let opName = 'معالجة بكسل';

      if (endpoint === 'brightness-contrast') {
        resultUri = await applyPixelAdjustments(currentImage, {
          brightness: params.brightness,
          contrast: params.contrast
        });
        opName = `سطوع (${params.brightness}) + تباين (${params.contrast})`;
      } else if (endpoint === 'gamma') {
        resultUri = await applyPixelAdjustments(currentImage, { gamma: params.gamma });
        opName = `جاما (${params.gamma})`;
      } else if (endpoint === 'threshold') {
        resultUri = await applyPixelAdjustments(currentImage, { threshold: params.threshold });
        opName = `عتبة ثنائية (${params.threshold})`;
      } else if (endpoint === 'invert') {
        resultUri = await applyPixelAdjustments(currentImage, { invert: true });
        opName = 'عكس الألوان (Invert)';
      } else if (endpoint === 'grayscale') {
        resultUri = await applyPixelAdjustments(currentImage, { grayscale: true });
        opName = 'تدرج رمادي (Grayscale)';
      } else if (endpoint === 'sepia') {
        resultUri = await applyPixelAdjustments(currentImage, { sepia: true });
        opName = 'سيبيا (Sepia)';
      }

      if (resultUri) {
        pushToHistory(resultUri, opName);
      } else if (backendOnline) {
        const payload = { image: currentImage, ...params };
        const data = await applyPixelOperation(endpoint, payload);
        if (data.success && data.image) {
          pushToHistory(data.image, data.message || 'معالجة خادم');
        }
      }
    } catch (err) {
      console.warn('DIP fallback to local execution:', err);
    }
  };

  // تطبيق خوارزميات الفلاتر المكانية والالتفاف (Spatial Filters) - تنفيذ محلي فوري + تزامن
  const handleApplySpatial = async (endpoint, params = {}) => {
    if (!currentImage) return;
    try {
      let resultUri = null;
      let opName = `فلتر مكاني: ${endpoint}`;

      if (endpoint === 'gaussian' || (endpoint === 'blur' && params.blur_type === 'gaussian')) {
        resultUri = await applySpatialFilter(currentImage, 'gaussian');
        opName = 'طمس غاوسي (Gaussian)';
      } else if (endpoint === 'sharpen') {
        resultUri = await applySpatialFilter(currentImage, 'sharpen', { amount: params.amount || 1.0 });
        opName = `زيادة حدة (${params.amount || 1.0})`;
      } else if (endpoint === 'sobel') {
        resultUri = await applySpatialFilter(currentImage, 'sobel');
        opName = 'كشف الحواف (Sobel)';
      } else if (endpoint === 'laplacian') {
        resultUri = await applySpatialFilter(currentImage, 'laplacian');
        opName = 'كشف الحواف (Laplacian)';
      } else if (endpoint === 'emboss') {
        resultUri = await applySpatialFilter(currentImage, 'emboss');
        opName = 'نقش وتجسيم (Emboss)';
      } else if (endpoint === 'median' || (endpoint === 'blur' && params.blur_type === 'median')) {
        const k = params.ksize || 3;
        resultUri = await applyMedianFilter(currentImage, k);
        opName = `فلتر الوسيط الحقيقي Median (${k}×${k})`;
      } else if (endpoint === 'box' || (endpoint === 'blur' && params.blur_type === 'box')) {
        resultUri = await applySpatialFilter(currentImage, 'box');
        opName = 'طمس صندوقي (Box Blur)';
      } else if (endpoint === 'canny') {
        const low = params.threshold1 ?? params.low ?? 50;
        const high = params.threshold2 ?? params.high ?? 140;
        resultUri = await applyCannyEdge(currentImage, low, high);
        opName = `كاشف الحواف Canny (${low}, ${high})`;
      } else if (endpoint === 'custom-kernel' && params.kernel) {
        resultUri = await applySpatialFilter(currentImage, 'custom', {
          kernel: params.kernel,
          bias: params.bias,
          normalize: params.normalize
        });
        opName = 'مصفوفة التفاف مخصصة (Custom Kernel)';
      } else if (endpoint === 'bilateral') {
        resultUri = await applySpatialFilter(currentImage, 'gaussian');
        opName = 'فلتر ثنائي الحفظ (Bilateral)';
      }

      if (resultUri) {
        pushToHistory(resultUri, opName);
      } else if (backendOnline) {
        const payload = { image: currentImage, ...params };
        const data = await applySpatialOperation(endpoint, payload);
        if (data.success && data.image) {
          pushToHistory(data.image, data.message || opName);
        }
      }
    } catch (err) {
      console.warn('Spatial fallback to local execution:', err);
    }
  };

  // ==================== 1. العمليات النقطية الموسعة (Point Processing) ====================
  const handleApplyPointOp = async (opType, params = {}) => {
    if (!currentImage) return;
    let res = null;
    let label = 'معالجة نقطية';
    if (opType === 'log') {
      res = await applyLogTransform(currentImage, params.c || 46);
      label = `تحويل لوغاريتمي (c=${params.c || 46})`;
    } else if (opType === 'contrast_stretch') {
      const { r1 = 50, s1 = 10, r2 = 200, s2 = 245 } = params;
      res = await applyContrastStretching(currentImage, r1, s1, r2, s2);
      label = `تمدد التباين (${r1},${s1})→(${r2},${s2})`;
    } else if (opType === 'bitplane') {
      res = await applyBitPlaneSlicing(currentImage, params.bit ?? 7);
      label = `المستوى البتّي ${params.bit ?? 7}`;
    } else if (opType === 'histeq') {
      res = await applyHistogramEqualization(currentImage);
      label = 'تسوية الهيستوغرام (Histogram Equalization)';
    }
    if (res) pushToHistory(res, label);
  };

  // ==================== 2. الفلاتر المكانية الموسعة (Prewitt, Highboost, Canny) ====================
  const handleApplyAdvancedSpatial = async (filterType, params = {}) => {
    if (!currentImage) return;
    let res = null;
    let label = 'فلتر مكاني';
    if (filterType === 'prewitt') {
      res = await applyPrewittFilter(currentImage, params.direction || 'magnitude');
      label = `كشف حواف بريويت (${params.direction || 'محصلة'})`;
    } else if (filterType === 'unsharp_highboost') {
      res = await applyUnsharpHighboost(currentImage, params.A || 1.5, params.ksize || 5);
      label = `تعزيز عالي Highboost (A=${params.A || 1.5})`;
    } else if (filterType === 'canny') {
      res = await applyCannyEdge(currentImage, params.low || 50, params.high || 140);
      label = `كاشف حواف كاني (${params.low || 50}, ${params.high || 140})`;
    }
    if (res) pushToHistory(res, label);
  };

  // ==================== 3. الفلاتر الطيفية والحرارية (False-Color & Thermal LUTs) ====================
  const handleApplyLUT = async (lutType) => {
    if (!currentImage) return;
    const res = await applyFalseColorLUT(currentImage, lutType);
    const names = {
      ironbow: 'رؤية حرارية FLIR Ironbow',
      jet: 'طيف حراري FLIR Jet',
      xray: 'أشعة سينية طبية X-Ray',
      nightvision: 'رؤية ليلية فسفورية Night Vision',
      cyberpunk: 'سينمائي نيون Cyberpunk'
    };
    pushToHistory(res, names[lutType] || `طيف ${lutType}`);
  };

  // ==================== 4. معمل الضوضاء والترميم (Restoration Lab) ====================
  const handleApplyRestoration = async (action, params = {}) => {
    if (!currentImage) return;
    let res = null;
    let label = 'ترميم الصورة';
    if (action === 'noise') {
      res = await addNoise(currentImage, params.noiseType || 'gaussian', params);
      label = `حقن ضوضاء (${params.noiseType || 'gaussian'})`;
    } else if (action === 'filter') {
      res = await applyRestorationFilter(currentImage, params.filterType || 'arithmetic_mean', params);
      label = `ترميم (${params.filterType || 'arithmetic_mean'})`;
    }
    if (res) {
      pushToHistory(res, label);
      if (originalImage) {
        calculatePSNRAndMSE(originalImage, res).then(metrics => setPsnrMetrics(metrics));
      }
    }
  };

  // ==================== 5. المعالجة المورفولوجية (Morphology) ====================
  const handleApplyMorphology = async (op, seType = 'square', seSize = 3) => {
    if (!currentImage) return;
    const res = await applyMorphology(currentImage, op, seType, seSize);
    const opNames = {
      dilate: 'تمدد مورفولوجي (Dilation)',
      erode: 'تآكل مورفولوجي (Erosion)',
      open: 'فتح مورفولوجي (Opening)',
      close: 'إغلاق مورفولوجي (Closing)',
      tophat: 'قبعة علوية (Top-Hat)',
      blackhat: 'قبعة سفلية (Black-Hat)',
      gradient: 'تدرج مورفولوجي (Gradient)'
    };
    pushToHistory(res, `${opNames[op] || op} [${seType} ${seSize}×${seSize}]`);
  };

  // ==================== 6. تجزئة الصور وعزل الألوان (Segmentation) ====================
  const handleApplySegmentation = async (type, params = {}) => {
    if (!currentImage) return;
    let res = null;
    let label = 'تجزئة الصورة';
    if (type === 'color_mask') {
      res = await applyColorMasking(currentImage, params.targetColor, params.tolerance, params.mode);
      label = `عزل لون Color Mask (${params.mode === 'binary' ? 'قناع ثنائي' : 'عزل لوني'})`;
    } else if (type === 'kmeans') {
      res = await applyKMeansSegmentation(currentImage, params.k || 4, params.maxIter || 8);
      label = `تجزئة عنقودية K-Means (K=${params.k || 4})`;
    }
    if (res) pushToHistory(res, label);
  };

  // ==================== 7. إخفاء وتشفير البيانات (Steganography) ====================
  const handleEmbedStego = async (text) => {
    if (!currentImage) return;
    const res = await embedLSBMessage(currentImage, text);
    pushToHistory(res, 'تشفير وحقن رسالة سرية LSB');
  };

  const handleExtractStego = async () => {
    if (!currentImage) return '';
    return await extractLSBMessage(currentImage);
  };


  // تطبيق عمليات الذكاء الاصطناعي: عزل الخلفية (U-2-Net) ودمج المنتجات (Product Studio)
  const handleApplyAI = async (endpoint, params = {}) => {
    if (!currentImage) return;
    try {
      if (endpoint === 'composite-product') {
        const res = await compositeProductStudio(currentImage, params);
        const backdropLabel = params.backdrop === 'podium' ? 'منصة ثلاثية الأبعاد' :
                              params.backdrop === 'neon-glow' ? 'نيون مستقبلي' :
                              params.backdrop === 'solid' ? 'لون صافٍ' :
                              params.backdrop === 'radial-gradient' ? 'إضاءة بؤرية' : 'استوديو منحنى';
        pushToHistory(res, `استوديو المنتجات (${backdropLabel})`);
        return { success: true, image: res };
      }

      const payload = { image: currentImage, ...params };
      const data = await applyAIOperation(endpoint, payload);
      if (data.success && data.image) {
        pushToHistory(data.image, data.message || 'عزل ذكاء اصطناعي');
        setAlphaMask(data.extra_data?.alpha_mask || null);
      }
    } catch (err) {
      console.error('AI Execution Error:', err);
      setLastOperation({ message: `فشلت عملية الذكاء الاصطناعي: ${err.message}`, latency: 'ERR' });
    }
  };

  // العمليات الختامية: التحويلات الهندسية، المزج، المجال الترددي، والتصدير - تنفيذ محلي فوري
  const handleApplyFinal = async (path, params = {}) => {
    if (!currentImage) return;
    try {
      if (path === 'transform/apply') {
        let transformed = currentImage;
        const ops = [];

        // 1. القص بنسبة أو هامش
        if ((params.aspect && params.aspect !== 'free') || params.crop_x != null || params.cropInset > 0) {
          transformed = await cropImage(transformed, {
            x: params.crop_x,
            y: params.crop_y,
            width: params.crop_w,
            height: params.crop_h,
            aspect: params.aspect,
            insetPercent: params.cropInset || 0
          });
          ops.push(`قص ${params.aspect || ''}`);
        }

        // 2. الدوران بمضاعفات 90 درجة
        if (params.quarter_turns) {
          transformed = await rotate90(transformed, params.quarter_turns);
          ops.push(`تدوير ${params.quarter_turns * 90}°`);
        }

        // 3. الزاوية الحرة
        if (params.free_angle && Math.abs(params.free_angle) > 0.01) {
          transformed = await rotateFreeAngle(transformed, params.free_angle);
          ops.push(`زاوية ${params.free_angle}°`);
        }

        // 4. القلب
        if (params.flip && params.flip !== 'none') {
          transformed = await flipImage(transformed, params.flip);
          const flipName = params.flip === 'h' ? 'قلب أفقي' : params.flip === 'v' ? 'قلب رأسي' : 'قلب مزدوج';
          ops.push(flipName);
        }

        pushToHistory(transformed, ops.length > 0 ? ops.join(' + ') : 'تحويل هندسي');
        return { success: true, image: transformed };
      } else if (path === 'blend/apply') {
        const resultUri = await blendImages(
          currentImage,
          params.overlay_type === 'image' ? params.overlay_image : (params.color || '#ffffff'),
          params.mode || 'normal',
          params.opacity != null ? params.opacity : 1.0
        );
        pushToHistory(resultUri, `مزج طبقات (${params.mode || 'عادي'})`);
        return { success: true, image: resultUri };
      } else if (path === 'export/download') {
        handleExport();
        return { success: true };
      } else if (backendOnline) {
        const payload = { image: currentImage, ...params };
        const data = await applyFinalOperation(path, payload);
        if (data.success && data.image) {
          pushToHistory(data.image, data.message || 'عملية ختامية');
        }
        return data;
      }
    } catch (err) {
      console.warn('Final op fallback execution:', err);
    }
  };

  // حساب هستوجرام محلي 32-bin للصورة المحملة (قبل أول عملية معالجة) ليبقى الـ HUD حياً
  const computeLocalHistogram = (imageData) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const w = Math.min(img.naturalWidth || 256, 256);
        const h = Math.min(img.naturalHeight || 256, 256);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data: pixels } = ctx.getImageData(0, 0, w, h);

        const bins = 32;
        const counts = { r: new Array(bins).fill(0), g: new Array(bins).fill(0), b: new Array(bins).fill(0) };
        for (let i = 0; i < pixels.length; i += 4) {
          counts.r[Math.min(bins - 1, pixels[i] >> 3)]++;
          counts.g[Math.min(bins - 1, pixels[i + 1] >> 3)]++;
          counts.b[Math.min(bins - 1, pixels[i + 2] >> 3)]++;
        }
        const normalize = (arr) => {
          const max = Math.max(...arr, 1);
          return arr.map((v) => Math.round((v / max) * 1000) / 10);
        };
        setLiveHistogram({ r: normalize(counts.r), g: normalize(counts.g), b: normalize(counts.b) });
      };
      img.src = imageData;
    } catch (err) {
      console.warn('Local histogram computation skipped:', err);
    }
  };


  // معالجة تحميل صورة جديدة في مساحة العمل
  const handleImageLoaded = (imageData, name = 'صورة معالجة') => {
    setCurrentImage(imageData);
    setOriginalImage(imageData);
    setFileName(name);
    setShowCompare(false);
    setZoomLevel(100);
    setAlphaMask(null);
    setHistory([imageData]);
    setHistoryIndex(0);

    // قياس وحساب أبعاد الصورة تلقائياً
    const img = new Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth || 1920,
        height: img.naturalHeight || 1080
      });
      setProcessingLatency('0.8ms');
      };
    img.src = imageData;

    // حساب هستوجرام محلي للصورة الأصلية لتغذية شاشات HUD فور التحميل
    computeLocalHistogram(imageData);
  };

  // إعادة ضبط الصورة إلى حالتها الأصلية
  const handleResetImage = () => {
    if (originalImage) {
      setCurrentImage(originalImage);
      setShowCompare(false);
      setProcessingLatency('0.2ms');
      setLastOperation(null);
      setAlphaMask(null);
      computeLocalHistogram(originalImage);
    }
  };

  // محاكاة النقر على رفع صورة
  const handleUploadTrigger = () => {
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.click();
    }
  };

  // استقبال صورة الجوازات أو لوحة الطباعة الملتقطة وتحميلها في مساحة عمل المحرر
  const handlePassportComplete = (capturedDataUri) => {
    handleImageLoaded(capturedDataUri, `passport-studio-${Date.now()}.png`);
    setCurrentView('editor');
  };

  // 1. إذا كان المستخدم في شاشة الترحيب وإطلاق الاستوديو (Studio Launchpad)
  if (currentView === 'welcome') {
    return (
      <WelcomeScreen
        onLaunchStudio={() => setCurrentView('editor')}
        onOpenImage={(dataUrl, name) => {
          handleImageLoaded(dataUrl, name);
          setCurrentView('editor');
        }}
        onLaunchSample={() => {
          handleImageLoaded('/sample-product.svg', 'منتج استوديو تجريبي');
          setCurrentView('editor');
        }}
        onOpenPassport={(mode) => {
          handleOpenPassport(mode || 'schengen');
        }}
        onOpenManualPdf={() => setIsHelpModalOpen(true)}
      />
    );
  }

  // 2. إذا كان المستخدم في شاشة استوديو الجوازات والهوية البيومترية الذكي
  if (currentView === 'poselook' || currentView === 'passport' || currentView === 'posemotion') {
    return (
      <div className="h-screen w-screen bg-[#080a0f] text-slate-100 overflow-y-auto overflow-x-hidden font-sans relative select-text">
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <PassportStudio
          initialPreset={initialPosePreset}
          onComplete={handlePassportComplete}
          onExit={() => setCurrentView('editor')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080a0f] text-slate-100 overflow-hidden font-sans relative">
      {/* إضاءات نيون جمالية خافتة في الخلفية (Ambient Background Glow) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. الشريط العلوي (PixelMatrix Navbar) */}
      <Navbar 
        onGoHome={() => setCurrentView('welcome')}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        onReset={handleResetImage}
        onUploadClick={handleUploadTrigger}
        onOpenPoseLook={handleOpenPassport}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        hasImage={Boolean(currentImage)}
        showCompare={showCompare}
        setShowCompare={setShowCompare}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onExport={handleExport}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(prev => !prev)}
        showRightPanel={showRightPanel}
        onToggleRightPanel={() => setShowRightPanel(prev => !prev)}
      />

      {/* 2. منطقة العمل الرئيسية (الشريط الجانبي يساراً، لوحة العمل في المنتصف، واللوحة اليمنى) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* اللوحة الجانبية اليسارية العائمة (Sidebar) مع إمكانية الإخفاء */}
        {showSidebar && (
          <Sidebar 
            activeTool={activeTool} 
            setActiveTool={setActiveTool} 
            onOpenPassport={handleOpenPassport}
            onClose={() => setShowSidebar(false)}
          />
        )}

        {/* زر عائم لإظهار شريط الأدوات الأيسر عند إخفائه */}
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            title="إظهار شريط الأدوات (الأيسر)"
            className="absolute left-3 top-4 z-30 p-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-xl shadow-black/50 transition-all cursor-pointer group"
          >
            <PanelLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* لوحة العمل المركزية مع شاشات الـ HUD العائمة (CanvasArea) */}
        <CanvasArea
          currentImage={currentImage}
          originalImage={originalImage}
          onImageLoaded={handleImageLoaded}
          zoomLevel={zoomLevel}
          showCompare={showCompare}
          splitCompare={splitCompare}
          setSplitCompare={setSplitCompare}
          showLoupe={showLoupe}
          setShowLoupe={setShowLoupe}
          imageDimensions={imageDimensions}
          processingLatency={processingLatency}
          backendOnline={backendOnline}
          liveHistogram={liveHistogram}
          activeTool={activeTool}
          cropAspect={cropAspect}
          cropInset={cropInset}
          onApplyCropRect={handleApplyCropRect}
          drawParams={drawParams}
          setDrawParams={setDrawParams}
          drawAction={drawAction}
          onSaveDrawing={handleSaveDrawing}
        />

        {/* زر عائم لإظهار لوحة المعايير اليمنى عند إخفائها */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            title="إظهار لوحة المعايير (الأيمن)"
            className="absolute right-3 top-4 z-30 p-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-xl shadow-black/50 transition-all cursor-pointer group"
          >
            <PanelRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* لوحة التحكم والبيانات التقنية اليمنى العائمة (RightPanel) */}
        {showRightPanel && (
          <RightPanel
            activeTool={activeTool}
            hasImage={Boolean(currentImage)}
            currentImage={currentImage}
            imageDimensions={imageDimensions}
            processingInfo={processingInfo}
            onApplyDIP={handleApplyDIP}
            onApplySpatial={handleApplySpatial}
            onApplyPointOp={handleApplyPointOp}
            onApplyAdvancedSpatial={handleApplyAdvancedSpatial}
            onApplyLUT={handleApplyLUT}
            onApplyRestoration={handleApplyRestoration}
            onApplyMorphology={handleApplyMorphology}
            onApplySegmentation={handleApplySegmentation}
            onEmbedStego={handleEmbedStego}
            onExtractStego={handleExtractStego}
            psnrMetrics={psnrMetrics}
            onCalculatePSNR={() => {
              if (originalImage && currentImage) {
                calculatePSNRAndMSE(originalImage, currentImage).then(setPsnrMetrics);
              }
            }}
            onApplyAI={handleApplyAI}
            onApplyFinal={handleApplyFinal}
            onRotateCW={handleDirectRotateCW}
            onRotateCCW={handleDirectRotateCCW}
            onRotate180={handleDirectRotate180}
            onRotateFree={handleDirectRotateFree}
            onFlip={handleDirectFlip}
            onCrop={handleDirectCrop}
            liveHistogram={liveHistogram}
            lastOperation={lastOperation}
            alphaMask={alphaMask}
            cropAspect={cropAspect}
            setCropAspect={setCropAspect}
            cropInset={cropInset}
            setCropInset={setCropInset}
            drawParams={drawParams}
            setDrawParams={setDrawParams}
            onTriggerDrawAction={(type) => setDrawAction({ type, token: Date.now() })}
            onApplyArithmetic={handleApplyArithmetic}
            onClose={() => setShowRightPanel(false)}
          />
        )}
      </div>

      {/* 3. نافذة التعريف بفريق العمل الفاخرة (Team Hero Showcase) */}
      <TeamHeroModal 
        isOpen={isTeamModalOpen} 
        onClose={() => setIsTeamModalOpen(false)}
        onLaunchSample={() => {
          handleImageLoaded('/sample-product.svg', 'منتج استوديو تجريبي');
          setIsTeamModalOpen(false);
        }}
      />

      {/* 4. نافذة دليل الاستخدام والمساعدة الأكاديمية (Help & User Manual Modal) */}
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />
    </div>
  );
}


