@echo off
title VisionAI Backend (FastAPI)
echo ====================================================
echo Starting VisionAI Backend Server on http://localhost:8000
echo ====================================================
cd /d "%~dp0\backend"
set "PATH=C:\Users\abc\tools\nodejs;C:\Users\abc\.local\bin;%PATH%"
if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
pause
