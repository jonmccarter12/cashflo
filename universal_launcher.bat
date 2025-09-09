@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM  UNIVERSAL PROJECT OPENER
REM  This script scans for projects, prompts for a choice, and launches the
REM  correct Quick Start script for that project.
REM ==============================================================================

set "PROJECTS_DIR=C:\Users\jon\Desktop\Projects coding"
set "PROJECT_CHOICE="
set "PROJECT_COUNT=0"
set "LAUNCH_SCRIPT="

echo ========================================
echo     UNIVERSAL PROJECT OPENER
echo ========================================
echo.

:select_project
echo Available projects in %PROJECTS_DIR%:
echo.
set "PROJECT_COUNT=0"
for /d %%d in ("%PROJECTS_DIR%\*") do (
    set /a PROJECT_COUNT+=1
    set "PROJECT_NAME[!PROJECT_COUNT!]=%%~nd"
    echo !PROJECT_COUNT!. %%~nd
)

if "!PROJECT_COUNT!"=="0" (
    echo No projects found. Please create one first.
    pause
    exit /b 1
)
echo.
set /p PROJECT_CHOICE=Enter the number of the project to open: 
if not defined PROJECT_CHOICE goto select_project
if "!PROJECT_CHOICE!" gtr "!PROJECT_COUNT!" (
    echo Invalid choice. Please enter a number from 1 to !PROJECT_COUNT!.
    goto select_project
)

set "PROJECT_NAME_SELECTED=!PROJECT_NAME[%PROJECT_CHOICE%]!"
set "PROJECT_PATH=%PROJECTS_DIR%\!PROJECT_NAME_SELECTED!"

echo.
echo Searching for a launch script in '!PROJECT_NAME_SELECTED!'...

REM ---------- FIND THE LAUNCH SCRIPT ----------
if exist "%PROJECT_PATH%\quick_start.bat" (
    set "LAUNCH_SCRIPT=quick_start.bat"
) else (
    echo Error: Could not find a suitable launch script.
    echo Please make sure your project contains a file named 'quick_start.bat'.
    pause
    exit /b 1
)

echo Found launch script: !LAUNCH_SCRIPT!

echo.
echo ========================================
echo  LAUNCHING PROJECT
echo ========================================
echo.
start "" cmd /k "cd /d "%PROJECT_PATH%" && call "!LAUNCH_SCRIPT!""

endlocal