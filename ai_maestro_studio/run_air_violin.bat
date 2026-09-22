@echo off
chcp 65001 >nul
title AI Maestro Studio — Air Concert Violin
cd /d "%~dp0"

set PATH=%~dp0bin;C:\tools\fluidsynth\bin;%PATH%

if exist "%~dp0.venv\Scripts\activate.bat" (
    call "%~dp0.venv\Scripts\activate.bat"
) else if exist "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat" (
    call "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat"
) else if exist "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\activate.bat" (
    call "D:\imageProcessingProject\conductor-simulator\.venv\Scripts\activate.bat"
)

python modes\air_violin.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Air Concert Violin encountered an error.
    pause
)
