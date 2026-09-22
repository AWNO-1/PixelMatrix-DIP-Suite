import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Upload, 
  Download, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  Users,
  BookOpen,
  Home,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  ChevronDown
} from 'lucide-react';

/**
 * مكون الشريط العلوي (Navbar Component - PixelMatrix Studio)
 * تصميم مريح، غير مزدحم، خالي من أي تشوهات أو نصوص متداخلة.
 */
export default function Navbar({ 
  onGoHome,
  zoomLevel = 100, 
  setZoomLevel, 
  onReset, 
  onUploadClick,
  onOpenPoseLook,
  onOpenTeamModal,
  onOpenHelpModal,
  hasImage = false,
  showCompare,
  setShowCompare,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onExport,
  showSidebar = true,
  onToggleSidebar,
  showRightPanel = true,
  onToggleRightPanel
}) {
  const [showPoseDropdown, setShowPoseDropdown] = useState(false);
  const poseDropdownRef = useRef(null);

  // إغلاق قائمة الوضعيات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (poseDropdownRef.current && !poseDropdownRef.current.contains(e.target)) {
        setShowPoseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // اختصارات لوحة المفاتيح للتراجع والإعادة
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo && onUndo) onUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo && onRedo) onRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  return (
    <header dir="rtl" className="h-16 bg-[#080b12]/95 backdrop-blur-2xl border-b border-cyan-500/15 px-4 lg:px-6 flex items-center justify-between select-none z-40 relative">
      {/* خط توهج علوي رفيع */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

      {/* القسم الأيمن: شعار وهوية PixelMatrix وأزرار إظهار وإخفاء القوائم */}
      <div className="flex items-center gap-3">
        {/* زر إخفاء / إظهار لوحة المعايير والتحكم (القائمة اليمنى) */}
        {onToggleRightPanel && (
          <button
            onClick={onToggleRightPanel}
            title={showRightPanel ? "إخفاء لوحة المعايير (اليمين)" : "إظهار لوحة المعايير (اليمين)"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showRightPanel 
                ? 'bg-slate-900/80 text-cyan-400 border-cyan-500/30 hover:bg-cyan-950/40' 
                : 'bg-cyan-500/15 text-slate-300 border-cyan-500/50 hover:bg-cyan-500/25'
            }`}
          >
            {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
        )}

        {/* هوية النظام */}
        <button
          onClick={onGoHome}
          title="العودة لشاشة الترحيب"
          className="flex items-center gap-3 text-right group cursor-pointer"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-900 via-blue-900 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40 group-hover:ring-cyan-300 transition-all">
              <Cpu className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#080b12]" />
          </div>

          <div>
            <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent font-mono leading-tight">
              PixelMatrix
            </h1>
            <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
              استوديو معالجة الصور الرقمية
            </p>
          </div>
        </button>

        {/* زر العودة للشاشة الرئيسية */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            title="شاشة الترحيب"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/70 hover:bg-cyan-950/50 text-slate-300 hover:text-cyan-300 border border-cyan-500/20 text-xs font-sans transition-all cursor-pointer mr-2"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">الرئيسية</span>
          </button>
        )}
      </div>

      {/* القسم الأوسط: كبسولة التحكم والكانفاس المدمجة */}
      <div className="flex items-center gap-1 bg-[#0e1320]/90 border border-cyan-500/25 px-2.5 py-1.5 rounded-2xl shadow-xl shadow-black/40 backdrop-blur-xl">
        {/* التراجع والإعادة */}
        <button 
          title="تراجع (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-25 rounded-lg transition-all cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button 
          title="إعادة (Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-25 rounded-lg transition-all cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        {/* التكبير والتصغير */}
        <button 
          title="تصغير"
          onClick={() => setZoomLevel(prev => Math.max(25, prev - 10))}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <span className="text-xs font-mono font-semibold text-cyan-300 px-2 py-0.5 text-center bg-cyan-950/40 rounded border border-cyan-500/20">
          {zoomLevel}%
        </span>

        <button 
          title="تكبير"
          onClick={() => setZoomLevel(prev => Math.min(300, prev + 10))}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button 
          title="ملاءمة الشاشة"
          onClick={() => setZoomLevel(100)}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        {/* زر مقارنة قبل وبعد التعديل */}
        <button
          title="معاينة قبل وبعد التعديل"
          disabled={!hasImage}
          onClick={() => setShowCompare(!showCompare)}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
            showCompare 
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30' 
              : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-25'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline">مقارنة</span>
        </button>

        {/* زر إعادة ضبط الصورة إلى الأصل */}
        <button
          title="إعادة ضبط الصورة الأصلية"
          disabled={!hasImage}
          onClick={onReset}
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-25 rounded-lg transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* القسم الأيسر: الإجراءات والقائمة المنسدلة للوضعيات وأزرار التصدير */}
      <div className="flex items-center gap-2">
        {/* قائمة الوضعيات الرسمية المنسدلة المدمجة (بدلاً من 3 أزرار مبعثرة) */}
        {onOpenPoseLook && (
          <div className="relative" ref={poseDropdownRef}>
            <button
              onClick={() => setShowPoseDropdown(!showPoseDropdown)}
              className="px-3 py-1.5 bg-[#0e1320]/90 hover:bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="فحص الوضعيات البيومترية الرسمية للصور الشخصية"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الوضعيات الرسمية</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPoseDropdown && (
              <div className="absolute left-0 mt-2 w-52 bg-[#0c101d] border border-cyan-500/30 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in text-right font-sans">
                <div className="px-2.5 py-1.5 text-[10px] font-mono text-cyan-400/80 border-b border-cyan-500/15 mb-1 font-bold">
                  ICAO BIOMETRIC PRESETS
                </div>
                <button
                  onClick={() => {
                    onOpenPoseLook('schengen');
                    setShowPoseDropdown(false);
                  }}
                  className="w-full px-2.5 py-2 hover:bg-emerald-500/15 text-slate-200 hover:text-emerald-300 text-xs rounded-xl flex items-center gap-2 transition text-right"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">1. صورة الجواز الدولي</div>
                    <div className="text-[10px] text-slate-400 font-mono">Schengen 35×45 mm</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenPoseLook('us_visa');
                    setShowPoseDropdown(false);
                  }}
                  className="w-full px-2.5 py-2 hover:bg-cyan-500/15 text-slate-200 hover:text-cyan-300 text-xs rounded-xl flex items-center gap-2 transition text-right"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold">2. تأشيرة الفيزا</div>
                    <div className="text-[10px] text-slate-400 font-mono">US Visa 51×51 mm</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenPoseLook('national_id');
                    setShowPoseDropdown(false);
                  }}
                  className="w-full px-2.5 py-2 hover:bg-blue-500/15 text-slate-200 hover:text-blue-300 text-xs rounded-xl flex items-center gap-2 transition text-right"
                >
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-bold">3. بطاقة الهوية الوطنية</div>
                    <div className="text-[10px] text-slate-400 font-mono">National ID 40×50 mm</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* زر دليل الاستخدام الشامل */}
        {onOpenHelpModal && (
          <button
            onClick={onOpenHelpModal}
            className="px-3 py-1.5 bg-[#0e1628]/80 hover:bg-cyan-950/60 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            title="دليل الاستخدام والتشغيل الشامل"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-sans">دليل الاستخدام</span>
          </button>
        )}

        {/* زر فريق العمل */}
        {onOpenTeamModal && (
          <button
            onClick={onOpenTeamModal}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-900/80 hover:bg-cyan-950/50 text-slate-300 hover:text-cyan-300 text-xs font-medium rounded-xl border border-slate-800 hover:border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            title="فريق التطوير: أواب النزيلي - محمد العواضي - مشعل حاجب"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline font-sans">فريق العمل</span>
          </button>
        )}

        {/* زر فتح صورة */}
        <button
          onClick={onUploadClick}
          className="px-3.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/35 hover:border-cyan-400 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>فتح صورة</span>
        </button>

        {/* زر تصدير وحفظ العمل */}
        <button
          disabled={!hasImage}
          onClick={onExport}
          className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 disabled:text-slate-500 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-950" />
          <span>حفظ وتصدير</span>
        </button>

        {/* زر إخفاء / إظهار شريط الأدوات (القائمة اليسرى) */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={showSidebar ? "إخفاء شريط الأدوات (اليسار)" : "إظهار شريط الأدوات (اليسار)"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSidebar 
                ? 'bg-slate-900/80 text-cyan-400 border-cyan-500/30 hover:bg-cyan-950/40' 
                : 'bg-cyan-500/15 text-slate-300 border-cyan-500/50 hover:bg-cyan-500/25'
            }`}
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
