@echo off
title Auto Start - 
cd /d "%~dp0"

:: Start both services
start "Flask Server" cmd /k run_dev_server.bat
timeout /t 2 /nobreak >nul
start "Aider Chat" cmd /k start_aider.bat

exit
