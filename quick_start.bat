@echo off
title Quick Start - 
cd /d "%~dp0"

Starting Flask Server and Aider Chat...

start "Flask Server" cmd /k run_dev_server.bat
timeout /t 2 /nobreak >nul
start "Aider Chat" cmd /k start_aider.bat

echo Both windows are now open.
echo Close this window when done.
pause
