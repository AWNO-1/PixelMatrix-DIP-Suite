@echo off
setlocal enabledelayedexpansion
title "PixelMatrix Studio - Master Launcher"
cd /d "%~dp0"

echo ======================================================================
echo                PixelMatrix Studio - Master Launcher
echo          Digital Image Processing and Computer Vision (DIP)
echo ======================================================================
echo.

:: 1. Dynamic Python Detection
set "PYTHON_CMD="
if exist "%~dp0backend\venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0backend\venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0backend\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0backend\.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0..\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0..\.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0..\ai_maestro_studio\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0..\ai_maestro_studio\.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0..\conductor-simulator\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0..\conductor-simulator\.venv\Scripts\python.exe"

if not defined PYTHON_CMD (
    python --version >nul 2>nul
    if !ERRORLEVEL! EQU 0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    py -3 --version >nul 2>nul
    if !ERRORLEVEL! EQU 0 set "PYTHON_CMD=py -3"
)

if not defined PYTHON_CMD if exist "%USERPROFILE%\anaconda3\python.exe" set "PYTHON_CMD=%USERPROFILE%\anaconda3\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"

if not defined PYTHON_CMD (
    echo ======================================================================
    echo  [ERROR] Python is not detected on this system!
    echo ======================================================================
    echo  Please install Python 3.10+ from https://www.python.org/
    echo  and ensure "Add Python to PATH" is checked during installation.
    echo.
    pause
    exit /b 1
)

echo [System Check] Using Python command: %PYTHON_CMD%

:: 2. Auto-Check and Install Python Dependencies
echo [System Check] Checking Python backend dependencies...
%PYTHON_CMD% -c "import fastapi, uvicorn, cv2, numpy, rembg" >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [INFO] Installing missing Python dependencies: FastAPI, OpenCV, NumPy, rembg...
    %PYTHON_CMD% -m pip install -r "%~dp0backend\requirements.txt"
) else (
    echo [OK] All backend Python packages ready!
)

:: 3. Launch Backend
echo.
echo [1/2] Starting Backend Server: FastAPI on Port 8000...
start "PixelMatrix Backend" /d "%~dp0backend" cmd /k "%PYTHON_CMD% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: 4. Check Frontend and Launch
echo.
set "USE_DEV=0"
if exist "%~dp0frontend\node_modules" (
    where npm >nul 2>nul
    if !ERRORLEVEL! EQU 0 set "USE_DEV=1"
)

if "%USE_DEV%"=="1" (
    echo [2/2] Starting Frontend App: Vite Dev Server on Port 5173...
    start "PixelMatrix Frontend (Vite)" /d "%~dp0frontend" cmd /k "npm run dev"
) else (
    echo [2/2] Starting Frontend App: Pre-built Production Client on Port 5173...
    start "PixelMatrix Frontend (Static)" /d "%~dp0frontend\dist" cmd /k "%PYTHON_CMD% -m http.server 5173"
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