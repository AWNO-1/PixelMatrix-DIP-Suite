@echo off
setlocal enabledelayedexpansion
title "AI Maestro Studio - Master Control Hub"
cd /d "%~dp0"

set PATH=%~dp0bin;C:\tools\fluidsynth\bin;%PATH%

:: 1. Dynamic Python Virtual Environment Detection
set "VENV_ACT="
if exist "%~dp0.venv\Scripts\activate.bat" set "VENV_ACT=%~dp0.venv\Scripts\activate.bat"
if not defined VENV_ACT if exist "%~dp0..\.venv\Scripts\activate.bat" set "VENV_ACT=%~dp0..\.venv\Scripts\activate.bat"
if not defined VENV_ACT if exist "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat" set "VENV_ACT=%~dp0..\conductor-simulator\.venv\Scripts\activate.bat"
if not defined VENV_ACT if exist "%~dp0..\PixelMatrix\backend\.venv\Scripts\activate.bat" set "VENV_ACT=%~dp0..\PixelMatrix\backend\.venv\Scripts\activate.bat"

if defined VENV_ACT (
    call "%VENV_ACT%"
)

:: 2. Verify Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    where py >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        doskey python=py -3 $*
    ) else (
        echo [ERROR] Python not found in system PATH!
        echo Please install Python 3.10+ and add it to PATH.
        pause
        exit /b 1
    )
)

:: 3. Check Dependencies
python -c "import cv2, mediapipe, pygame, fluidsynth" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [System Check] Missing Python dependencies detected.
    echo [INFO] Installing required packages from requirements.txt...
    python -m pip install -r "%~dp0requirements.txt"
)

:: 4. Launch Studio
python "%~dp0studio_launcher.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] AI Maestro Studio encountered an error or closed.
    pause
)
