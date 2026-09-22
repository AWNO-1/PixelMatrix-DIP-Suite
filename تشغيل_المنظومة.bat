@echo off
chcp 65001 >nul
title PixelMatrix & AI Maestro Suite - Master Launcher
cd /d "%~dp0"

:MENU
cls
echo ======================================================================
echo       جامعة إب — كلية الحاسبات والعلوم التطبيقية • قسم علوم الحاسوب
echo     PixelMatrix Studio & AI Maestro Suite — المنظومة الهندسية الكاملة
echo              إشراف أستاذ المقرر: م. مالك المصنف
echo              رئيس الفريق: أواب النزيلي
echo ======================================================================
echo.
echo [1] تشغيل محرر الصور الرقمية المتقدم (PixelMatrix DIP Studio)
echo [2] تشغيل استوديو المايسترو وتتبع وضعيات الجسم (AI Maestro Studio)
echo [3] فحص وتثبيت كافة متطلبات وحزم النظام (Install All Dependencies)
echo [4] فتح دليل المناقشة والدفاع الأكاديمي الشامل (PDF Guide)
echo [5] فتح الدليل التشغيلي لمحرر الصور (User Manual PDF)
echo [6] فتح التقرير الأكاديمي الشامل (Academic Report PDF)
echo [0] خروج
echo.
set /p choice="أدخل رقم الخيار المطلوب [0-6]: "

if "%choice%"=="1" (
    cd /d "%~dp0PixelMatrix"
    start run_project.bat
    goto MENU
)
if "%choice%"=="2" (
    cd /d "%~dp0ai_maestro_studio"
    start run_studio.bat
    goto MENU
)
if "%choice%"=="3" (
    echo.
    echo جارٍ تثبيت متطلبات محرر الصور...
    python -m pip install -r "%~dp0PixelMatrix\backend\requirements.txt"
    echo.
    echo جارٍ تثبيت متطلبات استوديو المايسترو...
    python -m pip install -r "%~dp0ai_maestro_studio\requirements.txt"
    echo.
    echo اكتمل الفحص والتثبيت!
    pause
    goto MENU
)
if "%choice%"=="4" (
    start "" "%~dp0دليل_المناقشة_والدفاع_الأكاديمي_الشامل.pdf"
    goto MENU
)
if "%choice%"=="5" (
    start "" "%~dp0PixelMatrix\docs\PixelMatrix_User_Manual.pdf"
    goto MENU
)
if "%choice%"=="6" (
    start "" "%~dp0PixelMatrix\docs\PixelMatrix_Academic_Report.pdf"
    goto MENU
)
if "%choice%"=="0" exit /b 0
goto MENU
