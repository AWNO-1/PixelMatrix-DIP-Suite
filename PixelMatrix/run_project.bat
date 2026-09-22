@echo off
chcp 65001 >nul
title PixelMatrix Studio - Master Launcher
cd /d "%~dp0"

echo ======================================================================
echo                PixelMatrix Studio - Master Launcher
echo                Digital Image Processing & Computer Vision
echo ======================================================================
echo.

:: Detect Python Environment
set "PYTHON_EXE=python"
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0..\conductor-simulator\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0..\conductor-simulator\.venv\Scripts\python.exe"
) else if exist "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe"
)

:: Check Frontend Dependencies
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies (npm install)...
    echo Please wait, this is a one-time operation...
    pushd "%~dp0frontend"
    call npm install
    popd
    echo [OK] Dependencies installed successfully.
    echo.
)

echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "PixelMatrix Backend" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting Frontend App (Vite React on Port 5173)...
start "PixelMatrix Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo All services launched!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ======================================================================
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:5173