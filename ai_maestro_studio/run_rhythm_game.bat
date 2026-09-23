@echo off
setlocal enabledelayedexpansion
title "AI Maestro Studio - Rhythm and Pose Game"
cd /d "%~dp0"

set PATH=%~dp0bin;C:\tools\fluidsynth\bin;%PATH%

if exist "%~dp0.venv\Scripts\activate.bat" (
    call "%~dp0.venv\Scripts\activate.bat"
) else if exist "%~dp0..\.venv\Scripts\activate.bat" (
    call "%~dp0..\.venv\Scripts\activate.bat"
) else if exist "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat" (
    call "%~dp0..\conductor-simulator\.venv\Scripts\activate.bat"
)

python "%~dp0rhythm_game.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Rhythm Game encountered an error.
    pause
)
