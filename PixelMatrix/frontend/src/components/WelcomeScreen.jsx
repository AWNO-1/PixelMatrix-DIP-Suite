import React from 'react';
import {
  Sparkles,
  Sliders,
  Wand2,
  Activity,
  Layers,
  ShieldCheck,
  Download,
  FolderOpen,
  ArrowRight,
  Terminal,
  Cpu,
  Binary,
  Code2,
  ExternalLink,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

/**
 * شاشة الترحيب وإطلاق الاستوديو (Studio Launchpad & Welcome Screen)
 * تصميم زجاجي نيون مستقبلي (Obsidian & Electric Cyan Theme)
 */
export default function WelcomeScreen({
  onLaunchStudio,
  onOpenImage,
  onLaunchSample,
  onOpenPassport,
  onOpenManualPdf
}) {
  const fileInputRef = React.useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onOpenImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onOpenImage(ev.target.result, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const teamMembers = [
    {
      name: 'أواب النزيلي',
      enName: 'Awwab Al-Nuzaili',
      role: 'Software Architect & DIP Core',
      desc: 'بناء نواة المعالجة المكانية، كاشف كاني، وفلاتر الوسيط والاستعادة الإحصائية.'
    },
    {
      name: 'محمد العواضي',
      enName: 'Mohammed Al-Awadhi',
      role: 'CV Engineer & Algorithms',
      desc: 'هندسة تجزئة الألوان K-Means، تشفير البيانات LSB، ومختبر الالتفاف الرياضي.'
    },
    {
      name: 'مشعل حاجب',
      enName: 'Mishaal Hajeb',
      role: 'UI/UX & Biometrics Lead',
      desc: 'تصميم واجهة المستخدم النيونية، استوديو صور الجوازات البيومترية، وحسابات PSNR.'
    }
  ];

  const featureCards = [
    {
      title: 'تحسينات البكسل (Point Ops)',
      desc: 'تحويل لوغاريتمي، تصحيح غاما، تقطيع المستويات البتية، والتمدد التبايني.',
      icon: Sliders,
      tag: 'POINT'
    },
    {
      title: 'كاشف كاني الحقيقي وفلاتر الحدة',
      desc: 'خوارزمية Canny رباعية المراحل، وفلاتر Sobel و Prewitt و Highboost.',
      icon: Wand2,
      tag: 'SPATIAL'
    },
    {
      title: 'معمل العمليات الحسابية ومزج الصور',
      desc: 'طرح صورتين |A-B|، جمع متوسط وتقليل ضوضاء، ضرب أقنعة، ومزج خطي بأوزان.',
      icon: Layers,
      tag: 'ARITHMETIC'
    },
    {
      title: 'معمل الترميم وقياس الجودة PSNR',
      desc: 'فلتر الوسيط الحقيقي، Wiener، المتوسط التوافقي العكسي، وحساب PSNR/MSE فوري.',
      icon: Activity,
      tag: 'METRICS'
    },
    {
      title: 'التجزئة وعزل الألوان (Segmentation)',
      desc: 'تجميع عنقودي K-Means، عزل كروما ولوني دقيق، وأقنعة ثنائية.',
      icon: Binary,
      tag: 'SEGMENT'
    },
    {
      title: 'الوضعيات الثلاث بيومترياً (ICAO)',
      desc: 'فحص استقامة وتوازي الرأس والكتفين لجواز السفر والفيزا وبطاقة الهوية.',
      icon: ShieldCheck,
      tag: 'BIOMETRICS'
    }
  ];

  return (
    <div dir="rtl" className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#04060a] text-slate-100 flex flex-col justify-between relative select-none">
      {/* شبكة الخلفية النيونية التفاعلية */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1e3815_1px,transparent_1px),linear-gradient(to_bottom,#0e1e3815_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* الشريط العلوي للترحيب */}
      <header className="relative z-10 border-b border-cyan-500/15 bg-[#080d1a]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-teal-200 to-white bg-clip-text text-transparent">
                PixelMatrix
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                DIP STUDIO v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Digital Image Processing Academic Platform
            </p>
          </div>
        </div>

        {/* معلومات المقرر الأكاديمي وإشراف المدرس */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="text-left">
            <div className="text-slate-400 text-[10px]">ACADEMIC ADVISOR</div>
            <div className="text-cyan-300 font-semibold font-sans">م. مالك المصنف (Eng. Malek Almosanif)</div>
          </div>
          <div className="w-px h-8 bg-cyan-500/20" />
          <div className="text-left">
            <div className="text-slate-400 text-[10px]">UNIVERSITY & FACULTY</div>
            <div className="text-slate-200 font-semibold">جامعة إب — كلية الحاسبات والعلوم التطبيقية</div>
          </div>
          <div className="w-px h-8 bg-cyan-500/20" />
          <div className="text-left">
            <div className="text-slate-400 text-[10px]">COURSE</div>
            <div className="text-slate-200 font-semibold">Digital Image Processing</div>
          </div>
        </div>
      </header>

      {/* محتوى الـ Hero الرئيسي */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        {/* شارة التميز الأكاديمي */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6 shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>مشروع مقرر معالجة الصور الرقمية والرؤية الحاسوبية — جامعة إب</span>
        </div>

        {/* العنوان الرئيسي */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl font-sans">
          استوديو المعالجة الرقمية المتقدم
          <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
            دقة رياضية، سرعة 60 FPS، وميزات أكاديمية كاملة
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-4 leading-relaxed font-sans">
          منصة برمجية متكاملة تطبق الخوارزميات الحقيقية لمعالجة الصور: كاشف كاني، الفلتر الوسيط، المعالجة المورفولوجية، العمليات الحسابية ومزج الصور، والفحص البيومتري التلقائي للصور الرسمية.
        </p>

        {/* أزرار الإطلاق السريعة (Launch Actions) */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 w-full max-w-2xl">
          {/* زر دخول مساحة العمل الرئيسي */}
          <button
            onClick={onLaunchStudio}
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>دخول مساحة العمل (Launch Studio)</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* زر فتح صورة من الجهاز */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-cyan-950/60 text-cyan-300 hover:text-white font-bold text-sm border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-black/40"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>فتح صورة للبدء</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* زر تجربة عينة فورية */}
          <button
            onClick={onLaunchSample}
            className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-200 font-semibold text-sm border border-slate-700/60 hover:border-cyan-500/40 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>تجربة عينة فورية</span>
          </button>

          {/* زر تحميل دليل الاستخدام PDF */}
          <a
            href="/PixelMatrix_User_Manual.pdf"
            download="PixelMatrix_User_Manual.pdf"
            className="px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 font-semibold text-sm border border-cyan-500/20 hover:border-cyan-400/50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>دليل الاستخدام (PDF)</span>
          </a>
        </div>

        {/* شبكة ميزات المنصة الأكاديمية (DIP Features Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-14 w-full text-right">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/15 hover:border-cyan-400/40 hover:bg-cyan-950/15 transition-all duration-300 shadow-lg group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/25">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-200 group-hover:text-cyan-200 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* كروت فريق العمل الأكاديمي (Team Members) */}
        <div className="mt-14 w-full pt-10 border-t border-cyan-500/15">
          <div className="text-center mb-6">
            <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase block mb-1">
              ENGINEERING TEAM
            </span>
            <h2 className="text-lg font-bold text-white font-sans">
              فريق العمل المطور للمشروع
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-right">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#080d1a]/80 border border-cyan-500/20 hover:border-cyan-400/50 transition-all shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-cyan-400 text-xs font-mono">
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{member.name}</h4>
                    <span className="text-[10px] font-mono text-cyan-400 block">{member.enName}</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mb-1.5">{member.role}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* التذييل (Footer) */}
      <footer className="relative z-10 border-t border-cyan-500/15 bg-[#060913]/90 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
        <div>
          PixelMatrix DIP Studio © 2026 — Designed for Academic Excellence
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>OpenCV 4.10</span>
          <span>•</span>
          <span>NumPy 2.0</span>
          <span>•</span>
          <span>FastAPI</span>
          <span>•</span>
          <span>React 18 + Canvas API</span>
        </div>
      </footer>
    </div>
  );
}
