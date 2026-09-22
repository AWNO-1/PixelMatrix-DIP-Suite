import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Cpu, 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sliders, 
  ShieldCheck, 
  Eye, 
  Keyboard,
  Wand2,
  SlidersHorizontal,
  Crop,
  Palette,
  Activity,
  Lock,
  Scissors
} from 'lucide-react';

/**
 * نافذة دليل الاستخدام والتشغيل الشامل (PixelMatrix User Manual Hub)
 * دليل عملي تفصيلي يوضح وظيفة كل زر، وقائمة، ومنزلق في المحرر.
 */
export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('tools_guide');

  if (!isOpen) return null;

  const toolExplanations = [
    {
      category: '1. شريط التنقل العلوي (Top Navbar)',
      icon: SlidersHorizontal,
      items: [
        { name: '1. زر إخفاء/إظهار لوحة المعايير (أقصى اليمين)', desc: 'يقع في أقصى يمين الشريط العلوي لإخفاء أو إظهار لوحة المعايير اليمنى لتوسيع مساحة العمل.' },
        { name: '2. زر الرئيسية (Home)', desc: 'العودة الفورية لشاشة الترحيب واستعراض بيانات المشروع وفريق العمل.' },
        { name: '3. أزرار التراجع والإعادة (Undo / Redo)', desc: 'التراجع عن أي عملية معالجة خطوة للخلف (Ctrl+Z)، أو التقدم للأمام في سجل العمليات (Ctrl+Y).' },
        { name: '4. زر إعادة الضبط (Reset)', desc: 'إلغاء كافة الفلاتر والتعديلات والرجوع للصورة الخام الأولى بنقرة واحدة.' },
        { name: '5. أزرار التكبير والتصغير والملاءمة', desc: 'ضبط نسبة عرض الصورة على الكانفاس (من 25% وحتى 300%) مع زر الملاءمة التلقائية لإعادة الصورة للحجم 100%.' },
        { name: '6. زر ستارة المقارنة (Compare)', desc: 'تفعيل الستارة التفاعلية المنزلقة لمقارنة الصورة الأصلية والنتيجة المعالجة لحظة بلحظة.' },
        { name: '7. قائمة الوضعيات الرسمية (Official Poses ▾)', desc: 'قائمة منسدلة لاختبار فحص الصور الرسمية: الجواز الدولي (Schengen)، الفيزا الأمريكية، والهوية الوطنية.' },
        { name: '8. زر دليل الاستخدام (Manual)', desc: 'فتح نافذة دليل الاستخدام الشامل داخل المنصة وتحميل ملف الـ PDF.' },
        { name: '9. زر فريق العمل (Team)', desc: 'عرض بيانات الفريق المطور والمشرف الأكاديمي م. مالك المصنف.' },
        { name: '10. زر فتح صورة (Upload)', desc: 'فتح مستعرض ملفات الحاسوب لاختيار أي صورة بصيغة PNG أو JPG أو WebP ومعالجتها.' },
        { name: '11. زر حفظ وتصدير (Export)', desc: 'تصدير وتنزيل الصورة المعالجة بصيغة PNG ناصعة الجودة تلقائياً.' },
        { name: '12. زر إخفاء/إظهار شريط الأدوات (أقصى اليسار)', desc: 'يقع في أقصى يسار الشريط العلوي لإخفاء أو إظهار شريط الأدوات الأيسر، مع وجود أزرار عائمة على طرفي الكانفاس لإعادتهما.' }
      ]
    },
    {
      category: '2. شريط الأدوات الأيسر (Left Tool Rail) — الـ 14 أداة بالترتيب الكامل',
      icon: Wand2,
      items: [
        { name: '1. التحويلات الهندسية (AFFINE)', desc: 'قص حر تفاعلي بـ 8 مقابض، تحديد نسب أبعاد ثابتة (1:1, 16:9, 4:3)، وتدوير بزوايا 90 و 180 درجة وتدوير حر وقلب أفقي ورأسي.' },
        { name: '2. تحسينات البكسل (POINT)', desc: 'منزلقات السطوع والتباين والتشبع وتصحيح غاما، وزر التحويل اللوغاريتمي، وزر تسوية الهيستوجرام، وزر الصورة السالبة (255 - I).' },
        { name: '3. الفلاتر المكانية والحدة (SPATIAL)', desc: 'كاشف كاني الحقيقي (True Canny) بـ 4 مراحل وعتبة مزدوجة، فلاتر سوبيل وبريويت لكشف التدرج، فلاتر غاوس للتنعيم، وفلتر Highboost لزيادة الحدة.' },
        { name: '4. معمل الحسابات والمزج (ARITHMETIC)', desc: 'معمل مخصص لتطبيق العمليات الحسابية على صورتين: طرح |A-B| لكشف الحركة، جمع ومتوسط (A+B)/2 لتخفيف الضوضاء، ومزج ألفا التدريجي.' },
        { name: '5. الترميم وإزالة الضوضاء (RESTORE)', desc: 'أزرار حقن ضوضاء ملح وفلفل أو غاوسية، وفلتر الوسيط الحقيقي (Median Filter) لإزالة الشوائب، وفلتر وينر، وحساب الـ PSNR والـ MSE.' },
        { name: '6. تجزئة وعزل الألوان (SEGMENT)', desc: 'عزل الكروما المباشر (Chroma Key)، وأداة العزل اللوني، وخوارزمية عنقدة وتكميم الألوان K-Means مع منزلق عدد العناقيد K.' },
        { name: '7. المعالجة المورفولوجية (MORPH)', desc: 'تطبيق العمليات المورفولوجية السبع: التآكل (Erosion)، التمدد (Dilation)، الفتح، الإغلاق، قبعة الرأس (Top-Hat)، والتدرج المورفولوجي.' },
        { name: '8. الرؤية الحرارية والطيفية (LUT)', desc: 'تحويل الصورة لتلوين كاذب مستمر عبر قوالب: FLIR Ironbow، Jet، Medical X-Ray، و Night Vision الفسفورية.' },
        { name: '9. تشفير وحقن البيانات (STEGO)', desc: 'كتابة رسالة سرية وحقنها في المستوى البتي الأقل أهمية دون تغيير شكل الصورة، مع زر استخراج الرسالة فوراً.' },
        { name: '10. عزل الخلفية الذكي (AI MASK)', desc: 'عزل ذكي للأشخاص والمنتجات بنقرة زر مع دعم دمج المنتج في استوديو ثلاثي الأبعاد.' },
        { name: '11. الرسم والكتابة الحرة (DRAW)', desc: 'فرشاة رسم حرة، ممحاة، أشكال هندسية (خط، سهم، مستطيل، دائرة)، وإضافة نصوص توضيحية فوق الصورة.' },
        { name: '12. استوديو المنتجات ثلاثي الأبعاد (STUDIO)', desc: 'دمج المنتجات المعزولة على منصات 3D وخلفيات استوديو احترافية مع ظلال أرضية واقعية وانعكاسات زجاجية.' },
        { name: '13. مختبر الالتفاف ومجال التردد (MATRIX)', desc: 'تطبيق مصفوفات نواة 3×3 مخصصة يدوياً، وفلاتر مجال التردد السريع FFT (تمرير منخفض ومرتفع).' },
        { name: '14. الوضعيات الرسمية ICAO البيومترية (3 POSES)', desc: 'فحص استواء العينين وتوازي الكتفين بالكاميرا، ومطابقة معايير الجواز والفيزا والهوية، وتوليد شبكة الطباعة 4×6 بوصة بدقة 300 DPI.' }
      ]
    },
    {
      category: '3. لوحة المعايير والبيانات اليمنى (Right Panel)',
      icon: Sliders,
      items: [
        { name: 'تبويب المعايير والتحكم', desc: 'يعرض منزلقات وأزرار الأداة النشطة حالياً فقط (مثل عتبات كاني، أو حجم نواة الوسيط، أو نسب المزج) مع توضيح الصيغة الرياضية.' },
        { name: 'تبويب بيانات ومعالجة (Telemetry & Info)', desc: 'يعرض أبعاد الصورة، عمق الألوان، مدرج تكراري حي (Histogram 32-Bins)، وبطاقة Processing Info HUD التي توثق زمن التنفيذ بالمللي ثانية والمبدأ الأكاديمي.' },
        { name: 'بطاقة التصدير القابلة للطي (Final Export)', desc: 'تحديد صيغة التصدير (PNG, JPEG, WebP)، منزلق جودة الضغط، وزر التحميل المباشر.' }
      ]
    },
    {
      category: '4. أدوات الكانفاس التفاعلية (Canvas HUD)',
      icon: Eye,
      items: [
        { name: 'ستارة المقارنة المنزلقة (Split-Screen Curtain)', desc: 'خط ليزري فاصل يمكن سحبه بالماوس يميناً ويساراً لمقارنة الصورة الأصلية والنتيجة المعالجة بكسلاً ببكسل.' },
        { name: 'عدسة الفحص البكسلي 5×5 (Pixel Inspector Loupe)', desc: 'نافذة تكبير مجهرية تتبع مؤشر الفأرة لعرض قيم القنوات اللونية [R, G, B, A] الدقيقة وإحداثيات الموقع (X, Y).' },
        { name: 'شريط الحالة البصري السفلي', desc: 'يعرض نسبة التكبير الحالية، وأبعاد الصورة بالبكسل، ومعدل الإطارات الفعلي 60 FPS.' }
      ]
    }
  ];

  const shortcuts = [
    { key: 'Ctrl + Z', desc: 'تراجع عن آخر فلتر أو عملية معالجة (Undo)' },
    { key: 'Ctrl + Y / Ctrl+Shift+Z', desc: 'إعادة تطبيق العملية المتراجع عنها (Redo)' },
    { key: 'عجلة الفأرة (Scroll)', desc: 'تكبير وتصغير عرض الكانفاس بسلاسة (Zoom)' },
    { key: 'Space + السحب بالماوس', desc: 'تحريك الكانفاس في أي اتجاه (Pan)' },
    { key: 'زر مقارنة في الشريط العلوي', desc: 'تفعيل ستارة المقارنة التفاعلية قبل وبعد التعديل' },
    { key: 'زر عدسة 5×5 أسفل الكانفاس', desc: 'تفعيل عدسة التكبير المجهري لقيم البكسلات' }
  ];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar bg-[#080c16]/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex flex-col text-slate-100">
        
        {/* خط توهج علوي */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-cyan-500/20 transition-all cursor-pointer"
          title="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ترويسة النافذة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-900 via-blue-900 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
              <BookOpen className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-sans">
                  دليل الاستخدام والتشغيل الشامل
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                  STUDIO MANUAL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                شرح عملي وتفصيلي لكل زر، وأداة، ومنزلق داخل منصة PixelMatrix
              </p>
            </div>
          </div>

          {/* زر تحميل الدليل PDF */}
          <a
            href="/PixelMatrix_User_Manual.pdf"
            download="PixelMatrix_User_Manual.pdf"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer font-sans"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>تحميل دليل الاستخدام (PDF)</span>
          </a>
        </div>

        {/* أزرار التبديل بين الأقسام */}
        <div className="flex items-center gap-2 py-4 border-b border-cyan-500/10 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tools_guide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tools_guide'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>دليل الأزرار والأدوات التفصيلي</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>اختصارات التحكم السريع</span>
          </button>
        </div>

        {/* محتوى الأقسام */}
        <div className="flex-1 min-h-[300px]">
          {/* قسم 1: دليل الأزرار والأدوات التفصيلي */}
          {activeTab === 'tools_guide' && (
            <div className="space-y-6 animate-fade-in">
              {toolExplanations.map((group, gIdx) => {
                const GroupIcon = group.icon;
                return (
                  <div key={gIdx} className="p-4 rounded-2xl bg-[#0b101c]/80 border border-cyan-500/20 space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-cyan-500/15">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-cyan-200 font-sans">
                        {group.category}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {group.items.map((item, iIdx) => (
                        <div 
                          key={iIdx}
                          className="p-3 rounded-xl bg-slate-950/70 border border-cyan-500/10 hover:border-cyan-500/30 transition-all space-y-1"
                        >
                          <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>{item.name}</span>
                          </div>
                          <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans pr-3">
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* قسم 2: اختصارات لوحة المفاتيح والتحكم السريع */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shortcuts.map((sc, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0b101c]/80 border border-cyan-500/15 flex items-center justify-between gap-3"
                  >
                    <span className="text-xs text-slate-300 font-sans">
                      {sc.desc}
                    </span>
                    <kbd className="px-2.5 py-1 rounded bg-[#131b2e] border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold shadow-inner shrink-0">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/30 to-cyan-950/30 border border-cyan-500/20 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  يمكنك استخدام اختصارات لوحة المفاتيح <strong className="text-cyan-300">Ctrl+Z</strong> للتراجع السريع، و <strong className="text-cyan-300">Ctrl+Y</strong> للإعادة، كما يمكنك استخدام عجلة الفأرة للتكبير والتصغير الفوري فوق الكانفاس.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* التذييل: بطاقة التوثيق وفريق العمل */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>مشروع استوديو معالجة الصور الرقمية المتقدم • 2026</span>
          </div>

          <div className="text-slate-400 font-sans">
            فريق التطوير: <span className="text-cyan-300 font-semibold">أواب النزيلي</span> • <span className="text-cyan-300 font-semibold">محمد العواضي</span> • <span className="text-cyan-300 font-semibold">مشعل حاجب</span>
          </div>
        </div>

      </div>
    </div>
  );
}
