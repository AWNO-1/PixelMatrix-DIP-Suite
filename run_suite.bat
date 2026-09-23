@echo off
setlocal enabledelayedexpansion
title "PixelMatrix and AI Maestro Suite - Master Launcher"
cd /d "%~dp0"

:: ======================================================================
:: 1. Dynamic Python Detection
:: ======================================================================
set "PYTHON_CMD="

if exist "%~dp0.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0ai_maestro_studio\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0ai_maestro_studio\.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0PixelMatrix\backend\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0PixelMatrix\backend\.venv\Scripts\python.exe"
if not defined PYTHON_CMD if exist "%~dp0conductor-simulator\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0conductor-simulator\.venv\Scripts\python.exe"

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

:: ======================================================================
:: 2. Check if Python is found
:: ======================================================================
if not defined PYTHON_CMD (
    echo ======================================================================
    echo  [ERROR] Python is not detected on this system!
    echo ======================================================================
    echo.
    echo  Please install Python 3.10 or newer from:
    echo  https://www.python.org/downloads/
    echo.
    echo  IMPORTANT: Make sure to check "Add python.exe to PATH" during setup!
    echo.
    echo ======================================================================
    echo  [Notice] Please install Python 3.10+ to launch the suite.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

:: ======================================================================
:: 3. Launch Master Suite Python App
:: ======================================================================
%PYTHON_CMD% "%~dp0master_suite.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] Application exited. Press any key to close...
    pause >nul
)
