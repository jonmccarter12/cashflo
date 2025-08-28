@echo off
title Flask Server - 
cd /d "%~dp0"
call venv\Scripts\activate.bat
set "FLASK_APP=app.py"
set "FLASK_DEBUG=1"
echo Starting Flask development server...
echo Browser will open automatically at http://localhost:5000
echo Press CTRL+C to stop
flask run
pause
