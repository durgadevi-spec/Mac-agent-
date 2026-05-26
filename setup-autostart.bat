@echo off
REM Auto-start registry setup for Knockturn Employee Agent
REM This script adds the app to Windows startup

setlocal enabledelayedexpansion

set APP_NAME=Knockturn Employee Agent
set APP_PATH=%~dp0knockturn-agent.exe

REM Add to Windows Startup Registry
reg add "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run" /v "%APP_NAME%" /t REG_SZ /d "%APP_PATH%" /f

if errorlevel 1 (
    echo Failed to register auto-start
    pause
    exit /b 1
) else (
    echo Successfully registered %APP_NAME% for auto-start
    echo App will launch automatically when Windows starts
    pause
)
