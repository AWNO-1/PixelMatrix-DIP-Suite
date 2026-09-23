# -*- coding: utf-8 -*-
"""
جامعة إب — كلية الحاسبات والعلوم التطبيقية • قسم علوم الحاسوب
PixelMatrix Studio & AI Maestro Suite — المنظومة الهندسية الكاملة
إشراف أستاذ المقرر: م. مالك المصنف
رئيس الفريق والمهندس المعماري: أواب النزيلي
أعضاء الفريق: محمد العوضي • مشعل حاجب
"""

import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path

# Ensure UTF-8 output in Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent
PIXEL_MATRIX_DIR = ROOT_DIR / "PixelMatrix"
PIXEL_BACKEND_DIR = PIXEL_MATRIX_DIR / "backend"
PIXEL_FRONTEND_DIR = PIXEL_MATRIX_DIR / "frontend"
PIXEL_DIST_DIR = PIXEL_FRONTEND_DIR / "dist"
AI_MAESTRO_DIR = ROOT_DIR / "ai_maestro_studio"

def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")

def print_banner():
    print("=" * 72)
    print("      جامعة إب — كلية الحاسبات والعلوم التطبيقية • قسم علوم الحاسوب")
    print("    PixelMatrix Studio & AI Maestro Suite — المنظومة الهندسية الكاملة")
    print("             إشراف أستاذ المقرر: م. مالك المصنف")
    print("   رئيس الفريق والمهندس المعماري: أواب النزيلي (Team Leader & Architect)")
    print("      أعضاء الفريق: محمد العوضي (DIP Lead) • مشعل حاجب (Pose/UI Lead)")
    print("=" * 72)
    print()

def open_pdf(rel_path, name):
    full_path = ROOT_DIR / rel_path
    if full_path.exists():
        print(f"\n[INFO] جارٍ فتح {name}...")
        if sys.platform == "win32":
            os.startfile(str(full_path))
        else:
            subprocess.Popen(["xdg-open", str(full_path)])
    else:
        print(f"\n[ERROR] الملف غير موجود: {full_path}")
    input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def install_all_dependencies():
    print("\n" + "=" * 60)
    print("فحص وتثبيت كافة متطلبات النظام (Python Dependencies)")
    print("=" * 60)
    
    req_pixel = PIXEL_BACKEND_DIR / "requirements.txt"
    req_maestro = AI_MAESTRO_DIR / "requirements.txt"
    
    if req_pixel.exists():
        print(f"\n[1/2] تثبيت متطلبات محرر الصور: {req_pixel.name}")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_pixel)])
        
    if req_maestro.exists():
        print(f"\n[2/2] تثبيت متطلبات استوديو المايسترو: {req_maestro.name}")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_maestro)])
        
    print("\n[OK] اكتمل فحص وتثبيت المتطلبات بنجاح!")
    input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def launch_pixel_matrix():
    clear_screen()
    print_banner()
    print(">>> تشغيل محرر معالجة الصور الرقمية المتقدم (PixelMatrix DIP Studio)")
    print("-" * 72)
    
    python_exe = sys.executable
    
    # 1. Start Backend in separate window
    print("[1/2] تشغيل خادم المعالجة الخلفي (FastAPI on Port 8000)...")
    if sys.platform == "win32":
        backend_cmd = f'"{python_exe}" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000'
        subprocess.Popen(
            f'start "PixelMatrix Backend" /d "{PIXEL_BACKEND_DIR}" cmd /k {backend_cmd}',
            shell=True
        )
    else:
        subprocess.Popen(
            [python_exe, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(PIXEL_BACKEND_DIR)
        )
    
    time.sleep(1.5)
    
    # 2. Check frontend: dev vs dist
    has_node_modules = (PIXEL_FRONTEND_DIR / "node_modules").exists()
    npm_available = False
    try:
        p = subprocess.run(["where" if sys.platform == "win32" else "which", "npm"], capture_output=True)
        npm_available = (p.returncode == 0)
    except Exception:
        pass
    
    if has_node_modules and npm_available:
        print("[2/2] تشغيل واجهة React (Vite Dev Server on Port 5173)...")
        if sys.platform == "win32":
            subprocess.Popen(
                f'start "PixelMatrix Frontend (Vite)" /d "{PIXEL_FRONTEND_DIR}" cmd /k npm run dev',
                shell=True
            )
        else:
            subprocess.Popen(["npm", "run", "dev"], cwd=str(PIXEL_FRONTEND_DIR))
    else:
        print("[2/2] تشغيل النسخة الإنتاجية المدمجة (Python Static Server on Port 5173)...")
        if sys.platform == "win32":
            frontend_cmd = f'"{python_exe}" -m http.server 5173'
            subprocess.Popen(
                f'start "PixelMatrix Frontend (Static)" /d "{PIXEL_DIST_DIR}" cmd /k {frontend_cmd}',
                shell=True
            )
        else:
            subprocess.Popen([python_exe, "-m", "http.server", "5173"], cwd=str(PIXEL_DIST_DIR))
            
    print("\n" + "=" * 72)
    print("حالة الخدمات النشطة:")
    print("  • واجهة المستخدم (Frontend): http://localhost:5173")
    print("  • خادم العمليات الرقمية (Backend): http://127.0.0.1:8000")
    print("  • توثيق الـ API التفاعلي (Swagger Docs): http://127.0.0.1:8000/docs")
    print("=" * 72)
    print("\nجارٍ فتح المتصفح تلقائياً خلال ثانيتين...")
    time.sleep(2)
    webbrowser.open("http://localhost:5173")
    input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def launch_maestro_studio():
    clear_screen()
    print_banner()
    print(">>> تشغيل استوديو المايسترو وتتبع وضعيات الجسم (AI Maestro Studio)")
    print("-" * 72)
    launcher = AI_MAESTRO_DIR / "studio_launcher.py"
    if launcher.exists():
        subprocess.run([sys.executable, str(launcher)], cwd=str(AI_MAESTRO_DIR))
    else:
        print(f"[ERROR] الملف غير موجود: {launcher}")
        input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def launch_maestro_hall():
    clear_screen()
    print_banner()
    print(">>> تشغيل قاعة المايسترو الكبرى والحفلات ثلاثية الأبعاد (Maestro Concert Hall)")
    print("-" * 72)
    target = AI_MAESTRO_DIR / "maestro_hall.py"
    if target.exists():
        subprocess.run([sys.executable, str(target)], cwd=str(AI_MAESTRO_DIR))
    else:
        print(f"[ERROR] الملف غير موجود: {target}")
        input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def launch_rhythm_game():
    clear_screen()
    print_banner()
    print(">>> تشغيل لعبة إيقاع الحركة وتتبع الوضعيات (Rhythm & Pose Game)")
    print("-" * 72)
    target = AI_MAESTRO_DIR / "rhythm_game.py"
    if target.exists():
        subprocess.run([sys.executable, str(target)], cwd=str(AI_MAESTRO_DIR))
    else:
        print(f"[ERROR] الملف غير موجود: {target}")
        input("\nاضغط Enter للعودة إلى القائمة الرئيسية...")

def launch_instruments_menu():
    while True:
        clear_screen()
        print_banner()
        print(">>> استوديو الآلات الموسيقية الافتراضية بالذكاء الاصطناعي (Virtual Instruments)")
        print("-" * 72)
        print("[1] البيانو الهوائي التفاعلي (Air Piano)")
        print("[2] الطبول الهوائية والإيقاع (Air Drums & Percussion)")
        print("[3] الكمان الافتراضي (Air Violin)")
        print("[4] العود والغيتار الهوائي (Air Oud & Guitar)")
        print("[0] العودة للقائمة الرئيسية")
        print("-" * 72)
        choice = input("أدخل رقم الآلة [0-4]: ").strip()
        
        inst_map = {
            "1": ("air_piano.py", "البيانو الهوائي"),
            "2": ("air_drums.py", "الطبول الهوائية"),
            "3": ("air_violin.py", "الكمان الافتراضي"),
            "4": ("air_strings.py", "العود والغيتار الهوائي")
        }
        
        if choice == "0":
            break
        elif choice in inst_map:
            script, name = inst_map[choice]
            target = AI_MAESTRO_DIR / script
            print(f"\nجارٍ تشغيل {name}...")
            if target.exists():
                subprocess.run([sys.executable, str(target)], cwd=str(AI_MAESTRO_DIR))
            else:
                print(f"[ERROR] الملف غير موجود: {target}")
                input("\nاضغط Enter للمتابعة...")

def main_menu():
    while True:
        clear_screen()
        print_banner()
        print("[1] تشغيل محرر معالجة الصور الرقمية المتقدم (PixelMatrix DIP Studio)")
        print("[2] تشغيل استوديو المايسترو الشامل وتتبع حركات الجسم (AI Maestro Studio)")
        print("[3] تشغيل قاعة المايسترو الكبرى والحفلات ثلاثية الأبعاد (Maestro Concert Hall)")
        print("[4] تشغيل لعبة إيقاع الحركة وتتبع الوضعيات (Rhythm & Pose Game)")
        print("[5] استوديو الآلات الموسيقية الافتراضية (Piano, Drums, Violin, Oud/Strings)")
        print("-" * 72)
        print("[6] فتح دليل المناقشة والدفاع الأكاديمي الشامل (PDF Defense Guide)")
        print("[7] فتح الدليل التشغيلي لمحرر الصور (PixelMatrix User Manual PDF)")
        print("[8] فتح التقرير الأكاديمي الشامل لمحرر الصور (PixelMatrix Academic Report PDF)")
        print("[9] فحص وتثبيت كافة متطلبات وحزم النظام (Install Dependencies)")
        print("[0] خروج (Exit)")
        print("=" * 72)
        
        choice = input("\nأدخل رقم الخيار المطلوب [0-9]: ").strip()
        
        if choice == "1":
            launch_pixel_matrix()
        elif choice == "2":
            launch_maestro_studio()
        elif choice == "3":
            launch_maestro_hall()
        elif choice == "4":
            launch_rhythm_game()
        elif choice == "5":
            launch_instruments_menu()
        elif choice == "6":
            open_pdf("دليل_المناقشة_والدفاع_الأكاديمي_الشامل.pdf", "دليل المناقشة والدفاع الأكاديمي الشامل")
        elif choice == "7":
            open_pdf("PixelMatrix/docs/PixelMatrix_User_Manual.pdf", "الدليل التشغيلي لمحرر الصور")
        elif choice == "8":
            open_pdf("PixelMatrix/docs/PixelMatrix_Academic_Report.pdf", "التقرير الأكاديمي الشامل")
        elif choice == "9":
            install_all_dependencies()
        elif choice == "0":
            print("\nشكراً لاستخدامكم منظومة PixelMatrix & AI Maestro Suite!")
            time.sleep(1)
            sys.exit(0)

if __name__ == "__main__":
    main_menu()
