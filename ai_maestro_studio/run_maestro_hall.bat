@echo off
setlocal enabledelayedexpansion
title "AI Maestro Studio - Maestro Concert Hall"
cd /d "%~dp0"

set PATH=%~dp0bin;C:\tools\fluidsynth\bin;%PATH%

if exist "%~dp0.venv\Scripts\activate.bat" (
    call "%~dp0.venv\Scripts\activate.bat"
) else if exist "%~dp0..\.venv\Scripts\activate.bat" (
    call "%~dp0..\.venv\Scripts\activate.bat"
) else if exist "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat" (
    call "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat"
)

python "%~dp0maestro_hall.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Maestro Hall encountered an error.
    pause
)
