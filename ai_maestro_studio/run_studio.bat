@echo off
chcp 65001 >nul
title AI Maestro Studio — Master Control Hub
cd /d "%~dp0"

set PATH=%~dp0bin;C:\tools\fluidsynth\bin;%PATH%

:: Check virtual environment in multiple possible locations
if exist "%~dp0.venv\Scripts\activate.bat" (
    call "%~dp0.venv\Scripts\activate.bat"
) else if exist "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat" (
    call "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat"
) else if exist "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\activate.bat" (
    call "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\activate.bat"
)

python -c "import cv2, mediapipe, pygame, fluidsynth" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [System Check] Missing Python dependencies detected.
    echo [INFO] Installing required packages from requirements.txt...
    python -m pip install -r requirements.txt
)

python studio_launcher.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] AI Maestro Studio encountered an error.
    pause
)
