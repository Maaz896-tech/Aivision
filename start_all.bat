@echo off
title VisionAI App Launcher
echo ====================================================
echo Starting VisionAI Full Stack (Backend + Frontend)
echo ====================================================
start "VisionAI Backend" cmd /k "%~dp0start_backend.bat"
timeout /t 3 /nobreak >nul
start "VisionAI Frontend" cmd /k "%~dp0start_frontend.bat"
echo Services launched.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:4200
