@echo off
title Aider Chat - 
cd /d "%~dp0"
call venv\Scripts\activate.bat

aider app.py
pause
