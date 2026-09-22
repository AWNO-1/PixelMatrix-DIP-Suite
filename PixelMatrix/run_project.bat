@echo off
chcp 65001 >nul
title PixelMatrix Studio - Master Launcher
cd /d "%~dp0"

echo ======================================================================
echo                PixelMatrix Studio - Master Launcher
echo                Digital Image Processing and Computer Vision
echo ======================================================================
echo.

:: Detect Python
set PYTHON_CMD=python
if exist "%~dp0backend\venv\Scripts\python.exe" set PYTHON_CMD="%~dp0backend\venv\Scripts\python.exe"
if exist "%~dp0backend\.venv\Scripts\python.exe" set PYTHON_CMD="%~dp0backend\.venv\Scripts\python.exe"
if exist "%~dp0..\conductor-simulator\.venv\Scripts\python.exe" set PYTHON_CMD="%~dp0..\conductor-simulator\.venv\Scripts\python.exe"
if exist "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe" set PYTHON_CMD="D:\imageProcessingProject\conductor-simulator\.venv\Scripts\python.exe"

echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "PixelMatrix Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting Frontend App (Vite React on Port 5173)...
start "PixelMatrix Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo All services launched!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ======================================================================
echo Opening browser in 3 seconds...
ping 127.0.0.1 -n 4 >nul
start http://localhost:5173