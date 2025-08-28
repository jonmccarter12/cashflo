@echo off
setlocal

rem Load API keys from the .env file
for /f "tokens=*" %%a in (.env) do (
    set "%%a"
)

:MENU
echo.
echo ============================
echo   Select API Provider for Aider
echo ============================
echo 1. Anthropic (Claude)
echo 2. Google (Gemini)
echo 3. OpenAI
echo ============================
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" goto ANTHROPIC
if "%choice%"=="2" goto GEMINI
if "%choice%"=="3" goto OPENAI
echo.
echo Invalid choice. Please try again.
goto MENU

:ANTHROPIC
if not defined ANTHROPIC_API_KEY (
    echo Error: ANTHROPIC_API_KEY not found in .env file.
    pause
    goto END
)
echo.
echo Using Anthropic API.
set API_KEY_TO_USE=%ANTHROPIC_API_KEY%
set MODEL_TO_USE=claude-3-5-sonnet
goto START_AIDER

:GEMINI
if not defined GEMINI_API_KEY (
    echo Error: GEMINI_API_KEY not found in .env file.
    pause
    goto END
)
echo.
echo Using Google Gemini API.
set API_KEY_TO_USE=%GEMINI_API_KEY%
set MODEL_TO_USE=gemini-2.5-flash
goto START_AIDER

:OPENAI
if not defined OPENAI_API_KEY (
    echo Error: OPENAI_API_KEY not found in .env file.
    pause
    goto END
)
echo.
echo Using OpenAI API.
set API_KEY_TO_USE=%OPENAI_API_KEY%
set MODEL_TO_USE=gpt-4o
goto START_AIDER

:START_AIDER
echo.
echo Starting Aider with %MODEL_TO_USE%...
echo.
aider --model "%MODEL_TO_USE%" --api-key "%MODEL_TO_USE%=%API_KEY_TO_USE%"
goto END

:END
endlocal
