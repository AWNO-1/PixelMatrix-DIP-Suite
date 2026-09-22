import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  Layers, 
  Activity, 
  Maximize2, 
  HardDrive, 
  Cpu, 
  Eye, 
  Sliders, 
  BarChart3, 
  Crosshair,
  Check,
  RotateCcw,
  Move,
  PenTool,
  Eraser,
  Minus,
  Square,
  Circle,
  MoveRight,
  Type,
  Trash2,
  Undo2,
  Crop,
  Palette,
  Columns2,
  Search,
  Hash
} from 'lucide-react';
import { mergeDrawingWithImage, extractPixelMatrix5x5 } from '../services/clientDIP';

/**
 * منطقة لوحة العمل المركزية (CanvasArea Component)
 * تدعم:
 * 1. نمط الشبكة الهندسية النقطية وشاشات البيانات التقنية العائمة (HUD).
 * 2. مقابض القص الحر الثمانية التفاعلية مع قناع تعتيم وشبكة الأثلاث.
 * 3. استوديو الرسم والكتابة المباشر (فرشاة حرة، ممحاة، خطوط، أشكال، أسهم، نصوص) مع الحفظ الفوري بدقة كاملة.
 * 4. سلايدر المقارنة التفاعلي الحي (Split Curtain Slider) بمقبض ليزري نيون.
 * 5. عدسة فحص مصفوفة البكسلات 5x5 الحية (Live Pixel Matrix Loupe) مع قراءة رقمية فورية.
 */
export default function CanvasArea({
  currentImage,
  originalImage,
  onImageLoaded,
  zoomLevel = 100,
  showCompare = false,
  splitCompare = false,
  setSplitCompare,
  showLoupe = false,
  setShowLoupe,
  imageDimensions = { width: 1280, height: 720 },
  processingLatency = '0.4ms',
  liveHistogram = null,
  activeTool = 'adjust',
  cropAspect = 'free',
  cropInset = 0,
  onApplyCropRect,
  drawParams = { tool: 'brush', color: '#06b6d4', size: 6, opacity: 1.0 },
  setDrawParams,
  drawAction = { type: 'idle', token: 0 },
  onSaveDrawing
}) {
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);
  const drawCanvasRef = useRef(null);

  // ==================== سلايدر المقارنة التفاعلي الحي (Split Curtain) ====================
  const [splitPos, setSplitPos] = useState(50); // percentage 0 - 100
  const isDraggingSplit = useRef(false);

  // ==================== عدسة مصفوفة البكسلات 5x5 الحية ====================
  const [loupeData, setLoupeData] = useState(null);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [loupeChannel, setLoupeChannel] = useState('gray'); // 'gray' | 'r' | 'g' | 'b'


  // ==================== 1. حالة القص الحر بالمقابض ====================
  // نسبة الصندوق المئوية داخل الصورة (0 - 100)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });

  // تحديث صندوق القص عند تغيير نسبة الأبعاد المحددة
  useEffect(() => {
    if (!imageDimensions.width || !imageDimensions.height) return;
    if (cropAspect === 'free') return;

    let targetRatio = 1;
    if (cropAspect === '1:1') targetRatio = 1;
    else if (cropAspect === '16:9') targetRatio = 16 / 9;
    else if (cropAspect === '4:3') targetRatio = 4 / 3;
    else if (cropAspect === '9:16') targetRatio = 9 / 16;
    else if (cropAspect === '3:2') targetRatio = 3 / 2;

    const imgAR = imageDimensions.width / imageDimensions.height;
    const ratioPct = targetRatio / imgAR;

    let newW = 80;
    let newH = 80 / ratioPct;
    if (newH > 80) {
      newH = 80;
      newW = 80 * ratioPct;
    }
    setCropBox({
      x: Math.max(0, (100 - newW) / 2),
      y: Math.max(0, (100 - newH) / 2),
      w: Math.min(100, newW),
      h: Math.min(100, newH)
    });
  }, [cropAspect, imageDimensions.width, imageDimensions.height]);

  // تحديث صندوق القص عند تغيير الهامش المئوي
  useEffect(() => {
    if (cropInset > 0) {
      const inset = Math.min(40, cropInset);
      setCropBox({
        x: inset,
        y: inset,
        w: 100 - 2 * inset,
        h: 100 - 2 * inset
      });
    }
  }, [cropInset]);

  // بدء سحب مقبض أو تحريك الصندوق
  const handleStartCropDrag = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = e.clientX || e.touches?.[0]?.clientX;
    const startY = e.clientY || e.touches?.[0]?.clientY;
    const initialBox = { ...cropBox };

    const onPointerMove = (moveEvent) => {
      const currentX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
      const currentY = moveEvent.clientY || moveEvent.touches?.[0]?.clientY;
      if (currentX == null || currentY == null) return;

      const deltaXPct = ((currentX - startX) / rect.width) * 100;
      const deltaYPct = ((currentY - startY) / rect.height) * 100;

      let next = { ...initialBox };

      if (handleType === 'move') {
        next.x = Math.max(0, Math.min(100 - initialBox.w, initialBox.x + deltaXPct));
        next.y = Math.max(0, Math.min(100 - initialBox.h, initialBox.y + deltaYPct));
      } else {
        if (handleType.includes('w')) {
          const maxDelta = initialBox.w - 5;
          const clamped = Math.min(maxDelta, Math.max(-initialBox.x, deltaXPct));
          next.x = initialBox.x + clamped;
          next.w = initialBox.w - clamped;
        }
        if (handleType.includes('e')) {
          const maxW = 100 - initialBox.x;
          next.w = Math.max(5, Math.min(maxW, initialBox.w + deltaXPct));
        }
        if (handleType.includes('n')) {
          const maxDelta = initialBox.h - 5;
          const clamped = Math.min(maxDelta, Math.max(-initialBox.y, deltaYPct));
          next.y = initialBox.y + clamped;
          next.h = initialBox.h - clamped;
        }
        if (handleType.includes('s')) {
          const maxH = 100 - initialBox.y;
          next.h = Math.max(5, Math.min(maxH, initialBox.h + deltaYPct));
        }

        // الحفاظ على نسبة الأبعاد إذا كانت محددة
        if (cropAspect && cropAspect !== 'free') {
          let targetRatio = 1;
          if (cropAspect === '1:1') targetRatio = 1;
          else if (cropAspect === '16:9') targetRatio = 16 / 9;
          else if (cropAspect === '4:3') targetRatio = 4 / 3;
          else if (cropAspect === '9:16') targetRatio = 9 / 16;
          else if (cropAspect === '3:2') targetRatio = 3 / 2;

          const imgAR = (imageDimensions.width || 1) / (imageDimensions.height || 1);
          const ratioPct = targetRatio / imgAR;

          if (handleType === 'n' || handleType === 's') {
            next.w = Math.min(100 - next.x, next.h * ratioPct);
          } else {
            next.h = Math.min(100 - next.y, next.w / ratioPct);
          }
        }
      }

      setCropBox(next);
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove);
    window.addEventListener('touchend', onPointerUp);
  };

  // تنفيذ القص بالمقابض الحالية
  const handleExecuteCrop = () => {
    if (onApplyCropRect) {
      onApplyCropRect(cropBox);
    }
  };

  const handleResetCrop = () => {
    setCropBox({ x: 5, y: 5, w: 90, h: 90 });
  };

  // ==================== معالجات سلايدر المقارنة التفاعلي (Split Curtain) ====================
  const handleStartSplitDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();

    const onPointerMove = (moveEvent) => {
      const clientX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
      if (clientX == null) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(1, Math.min(99, pct)));
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove);
    window.addEventListener('touchend', onPointerUp);
  };

  // ==================== معالجات عدسة مصفوفة البكسلات 5x5 ====================
  const handleImagePointerMove = (e) => {
    if (!showLoupe || !imageContainerRef.current || !currentImage) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
      setLoupeData(null);
      return;
    }

    setLoupePos({ x: clientX, y: clientY });

    const natX = (relX / rect.width) * (imageDimensions.width || rect.width);
    const natY = (relY / rect.height) * (imageDimensions.height || rect.height);

    extractPixelMatrix5x5(currentImage, natX, natY).then((res) => {
      if (res) setLoupeData(res);
    });
  };

  const handleImagePointerLeave = () => {
    if (showLoupe) setLoupeData(null);
  };

  // ==================== 2. استوديو الرسم والتوضيحات ====================
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [drawHistory, setDrawHistory] = useState([]);

  // تحديث أبعاد الكانفاس عند تحميل أو تغيير الصورة
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !imageDimensions.width || !imageDimensions.height) return;
    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawHistory([]);
  }, [currentImage, imageDimensions.width, imageDimensions.height]);

  // حفظ لقطة لسجل التراجع في الرسم
  const pushDrawHistory = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setDrawHistory((prev) => [...prev.slice(-15), snap]);
    } catch (e) {
      console.warn('Canvas snapshot skipped:', e);
    }
  };

  // تراجع عن خطوة رسم
  const handleUndoDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || drawHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    const prevSnap = drawHistory[drawHistory.length - 1];
    ctx.putImageData(prevSnap, 0, 0);
    setDrawHistory((prev) => prev.slice(0, prev.length - 1));
  };

  // مسح طبقة الرسم
  const handleClearDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    pushDrawHistory();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // دمج وحفظ الرسم في الصورة
  const handleCommitDrawing = async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !currentImage) return;
    try {
      const merged = await mergeDrawingWithImage(currentImage, canvas);
      if (onSaveDrawing) onSaveDrawing(merged);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawHistory([]);
    } catch (err) {
      console.error('Error committing drawing:', err);
    }
  };

  // الاستماع للأوامر القادمة من اللوحة الجانبية (RightPanel)
  useEffect(() => {
    if (!drawAction || drawAction.token === 0) return;
    if (drawAction.type === 'save') {
      handleCommitDrawing();
    } else if (drawAction.type === 'undo') {
      handleUndoDraw();
    } else if (drawAction.type === 'clear') {
      handleClearDraw();
    }
  }, [drawAction]);

  // تحويل إحداثيات شاشة المتصفح إلى إحداثيات بكسل الصورة الحقيقية
  const getCanvasPos = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  // بدء الرسم
  const handleMouseDownDraw = (e) => {
    if (activeTool !== 'draw') return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    pushDrawHistory();

    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    setIsDrawing(true);
    setStartPoint(pos);

    if (drawParams.tool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = drawParams.color || '#06b6d4';
      ctx.lineWidth = drawParams.size || 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = drawParams.opacity ?? 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
      ctx.stroke();
    } else if (drawParams.tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineWidth = (drawParams.size || 6) * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
      ctx.stroke();
    } else if (drawParams.tool === 'text') {
      const text = window.prompt('اكتب النص المراد إضافته:', 'نص توضيحي');
      if (text) {
        ctx.save();
        ctx.fillStyle = drawParams.color || '#06b6d4';
        ctx.globalAlpha = drawParams.opacity ?? 1.0;
        ctx.font = `bold ${Math.max(18, (drawParams.size || 6) * 4)}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, pos.x, pos.y);
        ctx.restore();
      }
      setIsDrawing(false);
    }
  };

  // متابعة حركة السحب للرسم أو الأشكال
  const handleMouseMoveDraw = (e) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const pos = getCanvasPos(e);
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (drawParams.tool === 'brush') {
      ctx.strokeStyle = drawParams.color || '#06b6d4';
      ctx.lineWidth = drawParams.size || 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = drawParams.opacity ?? 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (drawParams.tool === 'eraser') {
      ctx.lineWidth = (drawParams.size || 6) * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (startPoint) {
      if (drawHistory.length > 0) {
        ctx.putImageData(drawHistory[drawHistory.length - 1], 0, 0);
      }
      ctx.save();
      ctx.strokeStyle = drawParams.color || '#06b6d4';
      ctx.lineWidth = drawParams.size || 6;
      ctx.globalAlpha = drawParams.opacity ?? 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawParams.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (drawParams.tool === 'rect') {
        ctx.strokeRect(
          Math.min(startPoint.x, pos.x),
          Math.min(startPoint.y, pos.y),
          Math.abs(pos.x - startPoint.x),
          Math.abs(pos.y - startPoint.y)
        );
      } else if (drawParams.tool === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(pos.x - startPoint.x) / 2;
        const ry = Math.abs(pos.y - startPoint.y) / 2;
        const cx = Math.min(startPoint.x, pos.x) + rx;
        const cy = Math.min(startPoint.y, pos.y) + ry;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (drawParams.tool === 'arrow') {
        const headLen = Math.max(14, (drawParams.size || 6) * 3);
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handleMouseUpDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPoint(null);
  };

  // ==================== 3. معالجات الملفات والنماذج ====================
  const sampleImages = [
    {
      title: 'ساعة ذكية (استوديو المنتجات والـ 3D)',
      category: 'Product Mockup',
      url: '/sample-product.svg'
    },
    {
      title: 'صورة شخصية (الوضعيات البيومترية والجواز)',
      category: 'Passport Portrait',
      url: '/test-pose.jpg'
    },
    {
      title: 'صورة طبيعية (فلاتر التنعيم والالتفاف)',
      category: 'Landscape DIP',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80'
    }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onImageLoaded(event.target.result, file.name);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => onImageLoaded(event.target.result, file.name);
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSample = (sample) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        onImageLoaded(canvas.toDataURL('image/png'), sample.title);
      } catch (err) {
        onImageLoaded(sample.url, sample.title);
      }
    };
    img.onerror = () => onImageLoaded(sample.url, sample.title);
    img.src = sample.url;
  };

  return (
    <main 
      className="flex-1 canvas-dotted-grid relative overflow-hidden flex flex-col justify-between select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 1. شاشات البيانات الهندسية العائمة العلوية (Top HUDs) */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-30" dir="ltr">
        <div className="glass-hud py-1.5 px-3 rounded-xl flex items-center gap-2.5 pointer-events-auto border-cyan-500/25 text-xs font-mono whitespace-nowrap shadow-xl flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[10px]">RES:</span>
            <span className="text-cyan-300 font-bold">
              {currentImage ? `${imageDimensions.width}×${imageDimensions.height}` : '---×---'}
            </span>
          </div>

          <div className="w-px h-3 bg-slate-700/60 hidden sm:block" />

          <div className="items-center gap-1 text-[11px] hidden sm:flex">
            <span className="text-slate-400 text-[10px]">COLOR:</span>
            <span className="text-emerald-400 font-semibold">
              {currentImage ? 'sRGB' : 'EMPTY'}
            </span>
          </div>

          <div className="w-px h-3 bg-slate-700/60" />

          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-200 text-[11px]">
              {currentImage ? '2.4MB' : '0.0MB'}
            </span>
          </div>
        </div>

        <div className="glass-hud py-1.5 px-3 rounded-xl flex items-center gap-2.5 pointer-events-auto border-cyan-500/25 text-xs font-mono whitespace-nowrap shadow-xl flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-cyan-300 font-bold">{processingLatency}</span>
          </div>

          <div className="w-px h-3 bg-slate-700/60" />

          <div className="flex items-center gap-1 text-[11px]">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-emerald-400 font-semibold">FastAPI</span>
          </div>
        </div>
      </div>

      {/* 2. منطقة العمل المركزية */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
        {!currentImage ? (
          <div className="max-w-2xl w-full flex flex-col items-center text-center z-10">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-panel border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 bg-[#080d1a]/60 hover:bg-[#0c1326]/80 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center cursor-pointer group shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
              <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0b1528] to-[#122244] border border-cyan-400/40 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/20">
                <UploadCloud className="w-10 h-10 text-cyan-300 group-hover:text-cyan-200 transition-colors animate-pulse" />
              </div>

              <h2 className="text-lg font-bold text-white tracking-wide font-sans group-hover:text-cyan-200 transition-colors">
                اسحب وأفلت صورة المعالجة هنا
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-sans">
                أو انقر لتصفح ملفات جهازك. يدعم محرك PixelMatrix معالجة صيغ PNG, JPG, WEBP, BMP بدقة كاملة.
              </p>

              <div className="flex items-center gap-2 mt-6">
                {['PNG (شفافية كاملة)', 'JPG / JPEG', 'WEBP', 'BMP (Raw Data)'].map((ext) => (
                  <span 
                    key={ext} 
                    className="text-[10px] font-mono font-medium px-3 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-cyan-300/90 shadow-sm"
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full mt-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-cyan-500/15" />
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-sans font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>أو اختر نموذجاً هندسياً للتجربة الفورية:</span>
                </span>
                <div className="h-px flex-1 bg-cyan-500/15" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {sampleImages.map((sample, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleLoadSample(sample)}
                    className="group relative rounded-2xl overflow-hidden border border-cyan-500/15 hover:border-cyan-400/50 cursor-pointer bg-slate-950/60 p-2.5 flex items-center gap-3 transition-all hover:shadow-lg hover:shadow-cyan-500/10 backdrop-blur-md"
                  >
                    <img 
                      src={sample.url} 
                      alt={sample.title} 
                      className="w-12 h-12 object-cover rounded-xl group-hover:scale-105 transition-transform border border-slate-800" 
                    />
                    <div className="text-right overflow-hidden">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate font-sans">
                        {sample.title}
                      </p>
                      <span className="text-[9.5px] text-cyan-500/80 font-mono">
                        {sample.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-cyan-500/30 transition-transform duration-200 ease-out z-10"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            {/* زوايا استهداف هندسية */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none z-30" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none z-30" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none z-30" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none z-30" />

            <div className="canvas-checkerboard relative p-1.5">
              {/* الحاوية المطابقة تماماً لأبعاد الصورة المعروضة */}
              <div 
                ref={imageContainerRef} 
                onMouseMove={handleImagePointerMove}
                onMouseLeave={handleImagePointerLeave}
                className="relative inline-block select-none"
              >
                {splitCompare && originalImage ? (
                  /* ================= نمط ستارة المقارنة التفاعلية (Split Curtain) ================= */
                  <div className="relative inline-block select-none overflow-hidden rounded-xl shadow-2xl">
                    {/* الصورة الأصلية بالكامل في الخلفية */}
                    <img 
                      src={originalImage} 
                      alt="الأصلية" 
                      className="max-h-[66vh] max-w-[62vw] object-contain block select-none pointer-events-none"
                    />

                    {/* الصورة المعالجة مقصوصة بالسلايدر في الأمام */}
                    <div 
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{
                        clipPath: `inset(0 0 0 ${splitPos}%)`
                      }}
                    >
                      <img 
                        src={currentImage} 
                        alt="المعالجة" 
                        className="max-h-[66vh] max-w-[62vw] object-contain block select-none pointer-events-none"
                      />
                    </div>

                    {/* شريط ستارة المقارنة الليزري التفاعلي */}
                    <div 
                      style={{ left: `${splitPos}%` }}
                      className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-auto cursor-ew-resize z-20 group"
                      onMouseDown={handleStartSplitDrag}
                      onTouchStart={handleStartSplitDrag}
                    >
                      {/* مقبض السحب الزجاجي العائم في المركز */}
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#080d1a] border-2 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.8)] flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                        <Columns2 className="w-4 h-4 animate-pulse" />
                      </div>

                      {/* شارات BEFORE و AFTER */}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-slate-300 border border-slate-700 pointer-events-none">
                        BEFORE
                      </div>
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-cyan-950/90 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/40 pointer-events-none">
                        AFTER
                      </div>
                    </div>
                  </div>
                ) : (
                  /* العرض العادي للصورة */
                  <img 
                    ref={imageRef}
                    src={showCompare && originalImage ? originalImage : currentImage} 
                    alt="لوحة العمل" 
                    className="max-h-[66vh] max-w-[62vw] object-contain rounded-xl block select-none pointer-events-none shadow-2xl"
                  />
                )}

                {/* ================= طبقة مقابض القص الحر (Active in 'transform') ================= */}
                {activeTool === 'transform' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-auto z-20">
                    {/* أقنعة التعتيم الأربعة خارج منطقة القص */}
                    <div 
                      style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}%` }} 
                      className="absolute bg-black/60 pointer-events-none" 
                    />
                    <div 
                      style={{ top: `${cropBox.y + cropBox.h}%`, left: 0, right: 0, bottom: 0 }} 
                      className="absolute bg-black/60 pointer-events-none" 
                    />
                    <div 
                      style={{ top: `${cropBox.y}%`, left: 0, width: `${cropBox.x}%`, height: `${cropBox.h}%` }} 
                      className="absolute bg-black/60 pointer-events-none" 
                    />
                    <div 
                      style={{ top: `${cropBox.y}%`, left: `${cropBox.x + cropBox.w}%`, right: 0, height: `${cropBox.h}%` }} 
                      className="absolute bg-black/60 pointer-events-none" 
                    />

                    {/* صندوق القص التفاعلي */}
                    <div 
                      style={{ 
                        left: `${cropBox.x}%`, 
                        top: `${cropBox.y}%`, 
                        width: `${cropBox.w}%`, 
                        height: `${cropBox.h}%` 
                      }}
                      onMouseDown={(e) => handleStartCropDrag(e, 'move')}
                      onTouchStart={(e) => handleStartCropDrag(e, 'move')}
                      className="absolute border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-move select-none"
                    >
                      {/* شبكة الأثلاث (Rule of Thirds) */}
                      <div className="absolute left-1/3 top-0 bottom-0 w-px border-l border-dashed border-cyan-400/40 pointer-events-none" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px border-l border-dashed border-cyan-400/40 pointer-events-none" />
                      <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-cyan-400/40 pointer-events-none" />
                      <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-cyan-400/40 pointer-events-none" />

                      {/* أيقونة التحريك في المركز */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 hover:opacity-100 transition-opacity">
                        <Move className="w-5 h-5 text-cyan-300" />
                      </div>

                      {/* المقابض الأربعة في الزوايا */}
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'nw')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'nw')}
                        className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg cursor-nwse-resize hover:scale-125 transition-transform z-30" 
                        title="سحب الزاوية العلوية اليسرى"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'ne')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'ne')}
                        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg cursor-nesw-resize hover:scale-125 transition-transform z-30" 
                        title="سحب الزاوية العلوية اليمنى"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'sw')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'sw')}
                        className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg cursor-nesw-resize hover:scale-125 transition-transform z-30" 
                        title="سحب الزاوية السفلية اليسرى"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'se')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'se')}
                        className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg cursor-nwse-resize hover:scale-125 transition-transform z-30" 
                        title="سحب الزاوية السفلية اليمنى"
                      />

                      {/* المقابض الأربعة في الأضلاع */}
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'n')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'n')}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 rounded-full bg-cyan-300 border border-slate-950 shadow cursor-ns-resize hover:scale-110 transition-transform z-30" 
                        title="سحب الحافة العلوية"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 's')}
                        onTouchStart={(e) => handleStartCropDrag(e, 's')}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 rounded-full bg-cyan-300 border border-slate-950 shadow cursor-ns-resize hover:scale-110 transition-transform z-30" 
                        title="سحب الحافة السفلية"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'w')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'w')}
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full bg-cyan-300 border border-slate-950 shadow cursor-ew-resize hover:scale-110 transition-transform z-30" 
                        title="سحب الحافة اليسرى"
                      />
                      <div 
                        onMouseDown={(e) => handleStartCropDrag(e, 'e')}
                        onTouchStart={(e) => handleStartCropDrag(e, 'e')}
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full bg-cyan-300 border border-slate-950 shadow cursor-ew-resize hover:scale-110 transition-transform z-30" 
                        title="سحب الحافة اليمنى"
                      />

                      {/* شريط الإجراءات والبيانات اللحظية العائم أسفل صندوق القص */}
                      <div 
                        className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 py-1 px-2.5 bg-slate-950/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md z-40 whitespace-nowrap text-[11px] font-mono pointer-events-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <span className="text-cyan-300 font-bold">
                          {Math.round((cropBox.w / 100) * (imageDimensions.width || 100))} × {Math.round((cropBox.h / 100) * (imageDimensions.height || 100))} px
                        </span>
                        <div className="w-px h-3 bg-cyan-500/30" />
                        <button
                          onClick={handleExecuteCrop}
                          className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 shadow-md shadow-cyan-500/30"
                          title="تطبيق القص بالصندوق المحدد"
                        >
                          <Check className="w-3 h-3" />
                          <span>قص التحديد</span>
                        </button>
                        <button
                          onClick={handleResetCrop}
                          className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition-all text-[10px]"
                          title="إعادة ضبط الصندوق لكامل الصورة"
                        >
                          تصفير
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= طبقة استوديو الرسم المباشر (Active in 'draw') ================= */}
                {activeTool === 'draw' && (
                  <canvas 
                    ref={drawCanvasRef}
                    onMouseDown={handleMouseDownDraw}
                    onMouseMove={handleMouseMoveDraw}
                    onMouseUp={handleMouseUpDraw}
                    onTouchStart={handleMouseDownDraw}
                    onTouchMove={handleMouseMoveDraw}
                    onTouchEnd={handleMouseUpDraw}
                    className="absolute inset-0 w-full h-full z-20 cursor-crosshair select-none touch-none"
                  />
                )}

                {/* شارة توضيحية عند تفعيل وضع المقارنة */}
                {showCompare && (
                  <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 text-xs font-mono font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md z-30">
                    <span>ORIGINAL STATE (BEFORE)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* شريط أدوات الرسم العائم فوق لوحة العمل مباشرة عند اختيار أداة الرسم */}
      {activeTool === 'draw' && currentImage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 py-1.5 px-3 bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-md z-40 flex items-center gap-2 select-none">
          {/* أدوات الرسم الأساسية */}
          <div className="flex items-center gap-1">
            {[
              { id: 'brush', label: 'فرشاة', icon: PenTool },
              { id: 'eraser', label: 'ممحاة', icon: Eraser },
              { id: 'line', label: 'خط', icon: Minus },
              { id: 'rect', label: 'مستطيل', icon: Square },
              { id: 'circle', label: 'دائرة', icon: Circle },
              { id: 'arrow', label: 'سهم', icon: MoveRight },
              { id: 'text', label: 'نص', icon: Type },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = drawParams.tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setDrawParams && setDrawParams({ ...drawParams, tool: t.id })}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
                  }`}
                  title={t.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-cyan-500/20" />

          {/* دوائر الألوان السريعة */}
          <div className="flex items-center gap-1">
            {['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => setDrawParams && setDrawParams({ ...drawParams, color: c })}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  drawParams.color === c ? 'scale-125 border-cyan-400 ring-2 ring-cyan-400/50' : 'border-slate-700 hover:scale-110'
                }`}
                title={c}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-cyan-500/20" />

          {/* حجم الخط */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
            <span className="text-[10px] text-slate-400 font-sans">الحجم:</span>
            <input 
              type="range"
              min="1"
              max="40"
              value={drawParams.size || 6}
              onChange={(e) => setDrawParams && setDrawParams({ ...drawParams, size: Number(e.target.value) })}
              className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
            />
            <span className="w-4 text-center">{drawParams.size || 6}</span>
          </div>

          <div className="w-px h-5 bg-cyan-500/20" />

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndoDraw}
              disabled={drawHistory.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 disabled:opacity-30 transition-all"
              title="تراجع عن خطوة رسم"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearDraw}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all"
              title="مسح كامل لوحة الرسم"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCommitDrawing}
              className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/30 flex items-center gap-1 transition-all"
              title="تطبيق وحفظ الرسم فوق الصورة الحالية"
            >
              <Check className="w-3.5 h-3.5" />
              <span>دمج وحفظ في الصورة</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. شاشة HUD السفلية العائمة */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto z-30" dir="ltr">
        <div className="glass-hud py-1.5 px-3.5 rounded-xl flex items-center gap-3 border-cyan-500/25 shadow-2xl whitespace-nowrap font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-slate-400 hidden sm:inline">HIST:</span>
            <div className="flex items-end gap-[2px] h-5 w-20 bg-black/60 p-0.5 rounded border border-cyan-500/20 overflow-hidden">
              {liveHistogram
                ? (liveHistogram.gray || liveHistogram.r).slice(0, 16).map((val, i) => (
                    <div
                      key={i}
                      style={{ height: `${Math.max(6, Math.min(100, val))}%` }}
                      className={`flex-1 rounded-t-[1px] transition-all duration-300 ${
                        i < 6 ? 'bg-rose-500/80' : i < 11 ? 'bg-emerald-500/80' : 'bg-cyan-400/80'
                      }`}
                    />
                  ))
                : [45, 70, 85, 60, 95, 80, 50, 30, 20, 15, 10, 8, 12, 18, 25, 35].map((h, i) => (
                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-slate-700/60 rounded-t-[1px]" />
                  ))}
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/60" />

          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400 text-[11px]">ZOOM:</span>
            <span className="text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
              {zoomLevel}%
            </span>
          </div>

          <div className="w-px h-5 bg-slate-700/60" />

          {/* أزرار ستارة المقارنة وعدسة البكسل 5x5 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSplitCompare && setSplitCompare(!splitCompare)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-xs font-mono font-bold cursor-pointer ${
                splitCompare 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300' 
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent'
              }`}
              title="سلايدر ستارة المقارنة التفاعلي (Before / After Split Curtain)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ستارة المقارنة</span>
            </button>

            <button
              onClick={() => setShowLoupe && setShowLoupe(!showLoupe)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-xs font-mono font-bold cursor-pointer ${
                showLoupe 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300' 
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent'
              }`}
              title="عدسة فحص مصفوفة البكسلات الحية 5x5 (Live Matrix Loupe)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">عدسة 5×5</span>
            </button>
          </div>

          <div className="w-px h-5 bg-slate-700/60" />

          <span className="text-[10px] text-slate-400">
            VIEWPORT: <strong className="text-cyan-300">OBSIDIAN GLASS</strong>
          </span>
        </div>
      </div>

      {/* 4. عدسة مصفوفة البكسلات 5x5 الحية (Live Pixel Matrix Loupe) */}
      {showLoupe && loupeData && (
        <div 
          className="fixed z-50 pointer-events-none transition-all duration-75"
          style={{
            left: Math.min(window.innerWidth - 240, Math.max(20, loupePos.x + 20)),
            top: Math.min(window.innerHeight - 240, Math.max(20, loupePos.y - 120))
          }}
        >
          <div className="bg-[#080d1a]/95 border border-cyan-400/50 rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-xl text-slate-200 font-mono text-[10px] w-56 pointer-events-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <Hash className="w-3 h-3" />
                <span>5×5 PIXEL MATRIX</span>
              </span>
              <span className="text-slate-400 text-[9px]">
                ({loupeData.cx}, {loupeData.cy})
              </span>
            </div>

            {/* عينة اللون المركزي */}
            <div className="flex items-center justify-between gap-2 mb-2.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border border-white/40 shadow-inner" 
                  style={{ backgroundColor: loupeData.centerPixel.hex }} 
                />
                <span className="text-[10px] font-bold text-white">{loupeData.centerPixel.hex}</span>
              </div>
              <div className="text-[9px] text-slate-400 flex gap-1">
                <span className="text-rose-400 font-bold">R:{loupeData.centerPixel.r}</span>
                <span className="text-emerald-400 font-bold">G:{loupeData.centerPixel.g}</span>
                <span className="text-cyan-400 font-bold">B:{loupeData.centerPixel.b}</span>
              </div>
            </div>

            {/* شبكة أرقام المصفوفة 5x5 */}
            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[8.5px]">
              {loupeData.matrix.flat().map((p, idx) => {
                const val = loupeChannel === 'gray' ? p.gray : p[loupeChannel];
                return (
                  <div
                    key={idx}
                    className={`py-1 rounded font-bold transition-all ${
                      p.isCenter 
                        ? 'bg-cyan-400 text-slate-950 ring-2 ring-cyan-300 shadow-[0_0_8px_#22d3ee]' 
                        : 'bg-slate-900/90 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>

            {/* شريط اختيار القناة المعروضة */}
            <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-cyan-500/20 text-[9px]">
              <span className="text-slate-400 text-[8px]">CHANNEL:</span>
              <div className="flex gap-1">
                {[
                  { id: 'gray', label: 'GRAY' },
                  { id: 'r', label: 'R' },
                  { id: 'g', label: 'G' },
                  { id: 'b', label: 'B' }
                ].map(ch => (
                  <button
                    key={ch.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLoupeChannel(ch.id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                      loupeChannel === ch.id 
                        ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

