import React from 'react';
import { 
  Users, 
  Award, 
  Sparkles, 
  Cpu, 
  Terminal, 
  ShieldCheck, 
  Layers, 
  Wand2, 
  X, 
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  GraduationCap
} from 'lucide-react';

/**
 * الشاشة التعريفية الفاخرة بفريق العمل والمشروع (Executive Team Hero Showcase)
 * تصميم زجاجي داكن بلمسات نيون إلكترونية (Cyberpunk Obsidian & Electric Cyan)
 */
export default function TeamHeroModal({ isOpen, onClose, onLaunchSample }) {
  if (!isOpen) return null;

  const teamMembers = [
    {
      name: 'أواب النزيلي',
      nameEn: 'Awwab Al-Nuzaili',
      role: 'مهندس رؤية حاسوبية ومعالجة صور',
      roleEn: 'Computer Vision & DIP Engineer',
      tag: 'LEAD ARCHITECT',
      avatarGradient: 'from-cyan-500 to-blue-600',
      initials: 'AN',
      contributions: ['هندسة معمارية المحرك', 'خوارزميات الالتفاف والتجزئة', 'سلايدر المقارنة التفاعلي']
    },
    {
      name: 'محمد العواضي',
      nameEn: 'Mohammed Al-Awadhi',
      role: 'مهندس نظم ومعالجة إشارات رقمية',
      roleEn: 'Systems & DSP Engineer',
      tag: 'CORE DSP',
      avatarGradient: 'from-blue-600 to-indigo-600',
      initials: 'MA',
      contributions: ['معمل الضوضاء والترميم و PSNR', 'خوارزميات التجزئة و K-Means', 'المعالجة المورفولوجية']
    },
    {
      name: 'مشعل حاجب',
      nameEn: 'Mishaal Hajeb',
      role: 'مهندس واجهات تفاعلية وخوارزميات بيومترية',
      roleEn: 'UI/UX & Biometric Systems Engineer',
      tag: 'HUD & BIOMETRICS',
      avatarGradient: 'from-indigo-500 to-cyan-400',
      initials: 'MH',
      contributions: ['فحص الوضعيات البيومترية الثلاث', 'عدسة مصفوفة البكسلات 5x5', 'استوديو المنتجات والطبقات']
    }
  ];

  const highlights = [
    { label: 'زمن المعالجة', value: '< 1ms', desc: 'معالجة فورية Client Canvas 60 FPS' },
    { label: 'الخوارزميات المنفذة', value: '45+', desc: 'فلاتر مكانية، تجزئة، مورفولوجيا وترميم' },
    { label: 'دقة المقاييس الأكاديمية', value: 'PSNR / MSE', desc: 'حساب دقيق لنسبة الإشارة للضجيج' },
    { label: 'تشفير البكسل', value: 'LSB Stego', desc: 'إخفاء واسترجاع النصوص السرية' },
  ];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* حاوية النافذة المنبثقة */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#080c16]/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] p-6 sm:p-8 flex flex-col justify-between text-slate-100">
        
        {/* خط إشعاعي علوي */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-cyan-500/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* الرأس: شعار المشروع والمقرر */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>PROJECT SHOWCASE • 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
              PixelMatrix DIP Studio
            </span>
          </h1>

          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            منظومة معالجة الصور الرقمية المتقدمة — مشروع أكاديمي وتطبيقي متكامل يجمع بين قوة الحوسبة الرياضية وجمال الواجهات السيبرانية.
          </p>

          {/* بطاقة الإشراف الأكاديمي */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0f172a]/90 border border-cyan-500/20 text-xs shadow-inner">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">تحت إشراف الأستاذ المشرف:</span>
            <span className="font-bold text-cyan-300 font-sans">م. مالك المصنف (Eng. Malek A. Almosanif)</span>
          </div>
        </div>

        {/* شبكة بطاقات فريق العمل الثلاثة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className="relative group bg-gradient-to-b from-[#0e1626]/90 to-[#090d18]/95 border border-cyan-500/20 hover:border-cyan-400/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-950/50 flex flex-col justify-between"
            >
              {/* شارة التميز */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                  {member.tag}
                </span>
                <span className="text-slate-600 text-xs font-mono">0{i + 1}</span>
              </div>

              {/* الصورة الرمزية والاسم */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${member.avatarGradient} flex items-center justify-center font-bold font-mono text-white text-base shadow-md shadow-cyan-500/20 ring-1 ring-cyan-300/40`}>
                  {member.initials}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {member.nameEn}
                  </p>
                </div>
              </div>

              {/* التخصص والدور */}
              <p className="text-xs text-cyan-300/90 font-medium mb-3 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/10">
                {member.role}
              </p>

              {/* المساهمات الجوهرية */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                  أبرز المساهمات:
                </span>
                {member.contributions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* شريط الإحصائيات التقنية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-[#090e1c]/80 border border-cyan-500/15">
          {highlights.map((stat, idx) => (
            <div key={idx} className="text-center p-2">
              <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300">
                {stat.value}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {stat.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {stat.desc}
              </div>
            </div>
          ))}
        </div>

        {/* أزرار الإجراءات السريعة */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-cyan-500/15">
          <div className="text-xs text-slate-400 font-mono text-center sm:text-right">
            <span>نظام معالجة مستقل 100% • يدعم المعالجة دون اتصال بالإنترنت</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onLaunchSample && (
              <button
                onClick={() => {
                  onLaunchSample();
                  onClose();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>تحميل صورة عينة واختبار الفلاتر</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>دخول مساحة العمل (Launch Studio)</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
