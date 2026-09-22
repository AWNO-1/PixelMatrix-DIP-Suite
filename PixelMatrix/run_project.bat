@echo off
chcp 65001 >nul
title PixelMatrix Studio - Master Launcher
cd /d "%~dp0"

echo ======================================================================
echo                PixelMatrix Studio - Master Launcher
echo           Digital Image Processing & Computer Vision (DIP)
echo ======================================================================
echo.

:: 1. Detect Python
set PYTHON_CMD=python
if exist "%~dp0backend\venv\Scripts\python.exe" set PYTHON_CMD="%~dp0backend\venv\Scripts\python.exe"
if exist "%~dp0backend\.venv\Scripts\python.exe" set PYTHON_CMD="%~dp0backend\.venv\Scripts\python.exe"
if exist "%~dp0..\conductor-simulator\.venv\Scripts\python.exe" set PYTHON_CMD="%~dp0..\conductor-simulator\.venv\Scripts\python.exe"
if exist "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe" set PYTHON_CMD="D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe"

%PYTHON_CMD% --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found in system PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: 2. Auto-Check & Install Python Dependencies
echo [System Check] Checking Python backend dependencies...
%PYTHON_CMD% -c "import fastapi, uvicorn, cv2, numpy, rembg" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing missing Python dependencies (FastAPI, OpenCV, NumPy, Rembg)...
    %PYTHON_CMD% -m pip install -r "%~dp0backend\requirements.txt"
) else (
    echo [OK] All backend Python packages ready!
)

:: 3. Launch Backend
echo.
echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "PixelMatrix Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: 4. Check Frontend & Launch
echo.
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if not exist "%~dp0frontend\node_modules" (
        echo [INFO] Installing frontend packages (npm install)...
        cd /d "%~dp0frontend" && call npm install
    )
    echo [2/2] Starting Frontend App (Vite React on Port 5173)...
    start "PixelMatrix Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
) else (
    echo [INFO] Node.js/npm not detected on this PC.
    echo [INFO] Launching pre-built production app via Python Static Server on Port 5173...
    start "PixelMatrix Frontend (Python Server)" cmd /k "cd /d "%~dp0frontend\dist" && %PYTHON_CMD% -m http.server 5173"
)

echo.
echo ======================================================================
echo Services Status:
echo Backend API:  http://127.0.0.1:8000
echo Frontend Web: http://localhost:5173
echo ======================================================================
echo Opening browser in 3 seconds...
ping 127.0.0.1 -n 4 >nul
start http://localhost:5173