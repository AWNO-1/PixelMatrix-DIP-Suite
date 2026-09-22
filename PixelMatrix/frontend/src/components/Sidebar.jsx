import React from 'react';
import { 
  Crop, 
  Sliders, 
  Wand2, 
  Scissors, 
  PenTool, 
  Combine, 
  ShoppingBag, 
  Cpu, 
  Activity,
  Terminal,
  ShieldCheck,
  Palette,
  Binary,
  Sparkles,
  Lock,
  X,
  PanelLeftClose
} from 'lucide-react';

/**
 * قائمة الأدوات الجانبية العائمة (Floating Sidebar Component)
 * تصميم زجاجي عائم غير مزدحم (Electric Cyan & Obsidian Glassmorphism)
 */
export default function Sidebar({ activeTool, setActiveTool, onOpenPassport, onClose }) {
  const toolList = [
    {
      id: 'transform',
      label: 'التحويلات الهندسية',
      description: 'قص حر، تدوير زوايا، وقلب محاور',
      icon: Crop,
      badge: 'AFFINE'
    },
    {
      id: 'adjust',
      label: 'تحسينات البكسل',
      description: 'لوغاريتم، غاما، عتبة، ومستويات بتية',
      icon: Sliders,
      badge: 'POINT'
    },
    {
      id: 'filters',
      label: 'الفلاتر المكانية والحدة',
      description: 'كاشف كاني، سوبيل، وبريويت، وغاوسي',
      icon: Wand2,
      badge: 'SPATIAL'
    },
    {
      id: 'blend',
      label: 'معمل الحسابات والمزج',
      description: 'طرح |A-B|، جمع، ضرب، ومزج خطي α',
      icon: Combine,
      badge: 'ARITHMETIC'
    },
    {
      id: 'restoration',
      label: 'الترميم وإزالة الضوضاء',
      description: 'فلتر الوسيط الحقيقي، وينر، و PSNR',
      icon: Activity,
      badge: 'RESTORE'
    },
    {
      id: 'segmentation',
      label: 'تجزئة وعزل الألوان',
      description: 'عزل كروما، وعنقدة K-Means الذكية',
      icon: Palette,
      badge: 'SEGMENT'
    },
    {
      id: 'morphology',
      label: 'المعالجة المورفولوجية',
      description: 'تآكل، تمدد، فتح، إغلاق، وقبعة الرأس',
      icon: Binary,
      badge: 'MORPH'
    },
    {
      id: 'thermal-lut',
      label: 'الرؤية الحرارية والطيفية',
      description: 'FLIR Ironbow, Jet, X-Ray, Night-Vision',
      icon: Sparkles,
      badge: 'LUT'
    },
    {
      id: 'stego',
      label: 'تشفير وحقن البيانات',
      description: 'حقن واستخراج نصوص سرية عبر LSB',
      icon: Lock,
      badge: 'STEGO'
    },
    {
      id: 'bg-removal',
      label: 'عزل الخلفية الذكي',
      description: 'عزل ذكي U-2-Net و GrabCut',
      icon: Scissors,
      badge: 'AI MASK'
    },
    {
      id: 'draw',
      label: 'الرسم والكتابة الحرة',
      description: 'فرشاة، أشكال فيكتور، ونصوص طبقات',
      icon: PenTool,
      badge: null
    },
    {
      id: 'mockup',
      label: 'استوديو المنتجات 3D',
      description: 'قوالب 3D، منصة، وظلال وانعكاس',
      icon: ShoppingBag,
      badge: 'STUDIO'
    },
    {
      id: 'lab',
      label: 'مختبر الالتفاف الرياضي',
      description: 'مصفوفات Kernel 3x3 مخصصة ومجال تردد',
      icon: Cpu,
      badge: 'MATRIX'
    },
    {
      id: 'passport',
      label: 'الوضعيات الرسمية ICAO',
      description: 'فحص استواء العينين وتوازي الكتفين',
      icon: ShieldCheck,
      badge: '3 POSES',
      action: () => onOpenPassport && onOpenPassport('schengen')
    },
  ];

  return (
    <aside dir="rtl" className="w-72 flex-shrink-0 glass-panel m-3 mr-0 rounded-2xl flex flex-col justify-between select-none z-20 overflow-hidden shadow-2xl transition-all">
      {/* رأس القائمة الجانبية مع زر الإغلاق */}
      <div className="p-3 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 border-b border-cyan-500/10 pb-2.5 mb-1.5">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>وحدات المعالجة</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-500/80 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20">
              DIP v1.0
            </span>
            {onClose && (
              <button
                onClick={onClose}
                title="إخفاء شريط الأدوات"
                className="p-1 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 rounded-lg transition-all cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* قائمة أزرار الأدوات */}
        <div className="space-y-1 mt-1">
          {toolList.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (tool.action) {
                    tool.action();
                  } else {
                    setActiveTool(tool.id);
                  }
                }}
                className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-transparent text-white border border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-950/20 hover:border-cyan-500/20 border border-transparent'
                }`}
              >
                {/* الأيقونة */}
                <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                    : 'bg-slate-900/80 text-cyan-400 group-hover:bg-cyan-950 group-hover:text-cyan-300 border border-slate-800'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* نص الأداة والوصف */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold whitespace-nowrap ${
                      isActive ? 'text-cyan-200' : 'text-slate-300 group-hover:text-white'
                    }`}>
                      {tool.label}
                    </span>
                    {tool.badge && (
                      <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold tracking-wider shrink-0 ${
                        isActive
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-900 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5 opacity-80 group-hover:opacity-100 font-sans">
                    {tool.description}
                  </p>
                </div>

                {/* مؤشر الاختيار النيوني النشط */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-cyan-400 rounded-r-full shadow-[0_0_8px_#22d3ee]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* تذييل القائمة الجانبية: حالة المحرك */}
      <div className="p-3 border-t border-cyan-500/10 bg-[#080b12]/90">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col gap-1 text-[11px] font-mono">
          <div className="flex items-center justify-between text-cyan-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>DIP CORE ENGINE</span>
            </span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-sans">
            OpenCV + NumPy + Client Canvas
          </span>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[9.5px] text-emerald-400">
            <span>ONLINE (60 FPS)</span>
            <span className="text-slate-400">READY</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
