@echo off
title VisionAI Frontend (Angular)
echo ====================================================
echo Starting VisionAI Frontend on http://localhost:4200
echo ====================================================
cd /d "%~dp0\frontend"
set "PATH=C:\Users\abc\tools\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;C:\Program Files\Git\cmd;%PATH%"
call npm.cmd start
pause
