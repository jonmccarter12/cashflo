@echo off
setlocal enabledelayedexpansion

:: ==============================================
:: USER INPUT & GIT CONFIG
:: ==============================================
set "GIT_NAME=Juanathan"
set "GIT_EMAIL=jonmccarter12@gmail.com"

:: ==============================================
:: CHECK FOR MASTER ENV FILE AND LOAD IT FIRST
:: ==============================================
set "MASTER_ENV_FILE=%~dp0.env"
set "API_KEY="
set "ENV_VAR="
set "DEFAULT_MODEL="
set "GEMINI_FREE_KEY="
set "GEMINI_PAID_KEY="

if exist "%MASTER_ENV_FILE%" (
    echo Found master .env file, loading API configuration...
    for /f "usebackq tokens=1,2 delims==" %%a in ("%MASTER_ENV_FILE%") do (
        set "line=%%a"
        if "!line:~0,1!" neq "#" (
            if "%%a"=="OPENAI_API_KEY" (
                set "OPENAI_KEY=%%b"
            ) else if "%%a"=="ANTHROPIC_API_KEY" (
                set "ANTHROPIC_KEY=%%b"
            ) else if "%%a"=="GEMINI_API_KEY" (
                set "GEMINI_KEY=%%b"
            ) else if "%%a"=="GEMINI_FREE_API_KEY" (
                set "GEMINI_FREE_KEY=%%b"
            ) else if "%%a"=="GEMINI_PAID_API_KEY" (
                set "GEMINI_PAID_KEY=%%b"
            ) else if "%%a"=="AIDER_MODEL" (
                set "PREFERRED_MODEL=%%b"
            )
        )
    )
    
    set "HAS_MULTIPLE_GEMINI=0"
    if defined GEMINI_FREE_KEY if defined GEMINI_PAID_KEY set "HAS_MULTIPLE_GEMINI=1"
    if defined GEMINI_KEY if defined GEMINI_FREE_KEY set "HAS_MULTIPLE_GEMINI=1"
    if defined GEMINI_KEY if defined GEMINI_PAID_KEY set "HAS_MULTIPLE_GEMINI=1"
    
    if defined PREFERRED_MODEL (
        echo Using preferred model from .env: !PREFERRED_MODEL!
        if "!PREFERRED_MODEL:~0,6!"=="gemini" (
            if defined GEMINI_KEY set "API_KEY=!GEMINI_KEY!" & set "ENV_VAR=GEMINI_API_KEY"
            if defined GEMINI_FREE_KEY set "API_KEY=!GEMINI_FREE_KEY!" & set "ENV_VAR=GEMINI_API_KEY"
            if defined GEMINI_PAID_KEY set "API_KEY=!GEMINI_PAID_KEY!" & set "ENV_VAR=GEMINI_API_KEY"
        ) else if "!PREFERRED_MODEL:~0,6!"=="claude" (
            set "API_KEY=!ANTHROPIC_KEY!" & set "ENV_VAR=ANTHROPIC_API_KEY"
        ) else (
            set "API_KEY=!OPENAI_KEY!" & set "ENV_VAR=OPENAI_API_KEY"
        )
        set "DEFAULT_MODEL=!PREFERRED_MODEL!"
    ) else if "!HAS_MULTIPLE_GEMINI!"=="1" (
        echo.
        echo Multiple Google API keys detected!
        echo 1. Use FREE tier Gemini key
        echo 2. Use PAID tier Gemini key
        echo 3. Use OpenAI (GPT models)
        echo 4. Use Anthropic (Claude models)
        echo.
        set /p KEY_CHOICE=Which API would you like to use? (1-4) [default: 1]: 
        if "!KEY_CHOICE!"=="" set KEY_CHOICE=1
        
        if "!KEY_CHOICE!"=="1" (
            if defined GEMINI_FREE_KEY (
                set "API_KEY=!GEMINI_FREE_KEY!"
            ) else (
                set "API_KEY=!GEMINI_KEY!"
            )
            set "ENV_VAR=GEMINI_API_KEY"
            set "DEFAULT_MODEL=gemini/gemini-1.5-flash-latest"
            echo Using Gemini FREE tier
        ) else if "!KEY_CHOICE!"=="2" (
            if defined GEMINI_PAID_KEY (
                set "API_KEY=!GEMINI_PAID_KEY!"
            ) else (
                set "API_KEY=!GEMINI_KEY!"
            )
            set "ENV_VAR=GEMINI_API_KEY"
            set "DEFAULT_MODEL=gemini/gemini-1.5-pro-latest"
            echo Using Gemini PAID tier with Pro model
        ) else if "!KEY_CHOICE!"=="3" (
            set "API_KEY=!OPENAI_KEY!"
            set "ENV_VAR=OPENAI_API_KEY"
            set "DEFAULT_MODEL=gpt-4o-mini"
            echo Using OpenAI
        ) else if "!KEY_CHOICE!"=="4" (
            set "API_KEY=!ANTHROPIC_KEY!"
            set "ENV_VAR=ANTHROPIC_API_KEY"
            set "DEFAULT_MODEL=claude-3-5-sonnet-20241022"
            echo Using Anthropic Claude
        )
    ) else (
        if defined OPENAI_KEY (
            set "API_KEY=!OPENAI_KEY!"
            set "ENV_VAR=OPENAI_API_KEY"
            set "DEFAULT_MODEL=gpt-4o-mini"
        ) else if defined ANTHROPIC_KEY (
            set "API_KEY=!ANTHROPIC_KEY!"
            set "ENV_VAR=ANTHROPIC_API_KEY"
            set "DEFAULT_MODEL=claude-3-5-sonnet-20241022"
        ) else if defined GEMINI_KEY (
            set "API_KEY=!GEMINI_KEY!"
            set "ENV_VAR=GEMINI_API_KEY"
            set "DEFAULT_MODEL=gemini/gemini-1.5-flash-latest"
        ) else if defined GEMINI_FREE_KEY (
            set "API_KEY=!GEMINI_FREE_KEY!"
            set "ENV_VAR=GEMINI_API_KEY"
            set "DEFAULT_MODEL=gemini/gemini-1.5-flash-latest"
        ) else if defined GEMINI_PAID_KEY (
            set "API_KEY=!GEMINI_PAID_KEY!"
            set "ENV_VAR=GEMINI_API_KEY"
            set "DEFAULT_MODEL=gemini/gemini-1.5-pro-latest"
        )
    )
    
    if defined API_KEY (
        echo API configuration loaded successfully
    )
)

:: ==============================================
:: PROJECT & GIT CREATION
:: ==============================================
echo Creating directory and Git repo for '%PROJECT_NAME%'...
if exist "%PROJECT_NAME%" (
    echo Error: Directory '%PROJECT_NAME%' already exists
    pause
    exit /b 1
)
mkdir "%PROJECT_NAME%"
cd "%PROJECT_NAME%"
git init
git config user.name "%GIT_NAME%"
git config user.email "%GIT_EMAIL%"

:: ==============================================
:: CORE FILE CREATION
:: ==============================================
echo Creating project files...
mkdir templates

:: Create a proper Flask app.py file
(
    echo from flask import Flask, render_template
    echo import webbrowser
    echo from threading import Timer
    echo.
    echo app = Flask(__name__^)
    echo.
    echo def open_browser(^):
    echo     webbrowser.open('http://127.0.0.1:5000/'^)
    echo.
    echo @app.route('^/'^)
    echo def index(^):
    echo     return render_template('index.html'^)
    echo.
    echo if __name__ == '__main__':
    echo     # Open browser after a short delay
    echo     Timer(1.5, open_browser^).start(^)
    echo     app.run(debug=True, use_reloader=False^)
) > app.py

:: Create index.html
(
    echo ^<!DOCTYPE html^>
    echo ^<html lang="en"^>
    echo ^<head^>
    echo     ^<meta charset="UTF-8"^>
    echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
    echo     ^<title^>Flask App^</title^>
    echo ^</head^>
    echo ^<body^>
    echo     ^<h1^>Hello from Flask!^</h1^>
    echo ^</body^>
    echo ^</html^>
) > templates\index.html

:: Create requirements.txt
(
    echo Flask
    echo gunicorn
    echo aider-chat
    echo google-auth
    echo google-api-python-client
    echo litellm
    echo python-dotenv
) > requirements.txt

:: Create .gitignore
(
    echo # Virtual Environment
    echo venv/
    echo.
    echo # Python
    echo __pycache__/
    echo *.py[cod]
    echo *$py.class
    echo *.so
    echo.
    echo # Flask
    echo instance/
    echo .webassets-cache
    echo.
    echo # IDE
    echo .vscode/
    echo .idea/
    echo.
    echo # Environment variables
    echo .env
    echo.
    echo # OS
    echo .DS_Store
    echo Thumbs.db
) > .gitignore

:: ==============================================
:: CONFIG FILE CREATION
:: ==============================================
echo Creating configuration files...

:: Create aider.conf.yml
(
    echo # The default model for Aider. This is the model group defined in litellm.yml
    echo model: gpt-4o-mini_fallbacks
    echo.
    echo # This tells Aider to automatically load your .env file
    echo env-file: .env
    echo.
    echo # Critical cost-saving setting: limits chat history tokens.
    echo max-chat-history-tokens: 2048
    echo.
    echo # Use a cheaper model for repo-map summaries
    echo weak-model: gpt-4o-mini
    echo.
    echo # Commit settings: set to false for manual review
    echo auto-commits: false
    echo.
    echo # Linter and test commands
    echo lint: true
    echo test: false
    echo.
    echo # UI settings
    echo pretty: true
    echo stream: true
    echo dark-mode: true
    echo.
    echo # Files to always include as read-only context
    echo read:
    echo  - README.md
) > aider.conf.yml

:: Create litellm.yml
(
    echo # ==============================================================================
    echo # Model list: a prioritized list of all the models LiteLLM can use.
    echo # ==============================================================================
    echo model_list:
    echo  - model_name: gpt-4o-mini_fallbacks
    echo    litellm_params:
    echo      model: gpt-4o-mini
    echo      api_key: os.environ/OPENAI_API_KEY
    echo      num_retries: 2
    echo      
    echo  - model_name: claude-opus_fallbacks
    echo    litellm_params:
    echo      model: claude-opus-4-1
    echo      api_key: os.environ/ANTHROPIC_API_KEY
    echo      num_retries: 2
    echo.
    echo # ==============================================================================
    echo # Fallback strategy: This is the critical section for cost-saving.
    echo # ==============================================================================
    echo fallbacks:
    echo  - {"gpt-4o-mini_fallbacks": ["claude-opus_fallbacks"]}
) > litellm.yml

:: ==============================================
:: PYTHON SETUP
:: ==============================================
echo Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Error: Failed to create virtual environment
    echo Make sure Python is installed and added to PATH
    pause
    exit /b 1
)

echo Activating environment and installing dependencies...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment
    pause
    exit /b 1
)

echo Installing packages...
python -m pip install --upgrade pip
pip install -r requirements.txt

:: ==============================================
:: HELPER SCRIPT CREATION
:: ==============================================
echo Creating helper scripts...

:: Create run_dev_server.bat
(
    echo @echo off
    echo title Flask Server - %PROJECT_NAME%
    echo cd /d "%%~dp0"
    echo call venv\Scripts\activate.bat
    echo set "FLASK_APP=app.py"
    echo set "FLASK_DEBUG=1"
    echo echo Starting Flask development server...
    echo echo Browser will open automatically at http://localhost:5000
    echo echo Press CTRL+C to stop
    echo flask run
    echo pause
) > run_dev_server.bat

:: Create start_aider.bat
(
    echo @echo off
    echo title Aider Chat - %PROJECT_NAME%
    echo cd /d "%%~dp0"
    echo call venv\Scripts\activate.bat
    echo.
    echo aider app.py
    echo pause
) > start_aider.bat

:: Create quick_start.bat
(
    echo @echo off
    echo title Quick Start - %PROJECT_NAME%
    echo cd /d "%%~dp0"
    echo.
    echo Starting Flask Server and Aider Chat...
    echo.
    echo start "Flask Server" cmd /k run_dev_server.bat
    echo timeout /t 2 /nobreak ^>nul
    echo start "Aider Chat" cmd /k start_aider.bat
    echo.
    echo echo Both windows are now open.
    echo echo Close this window when done.
    echo pause
) > quick_start.bat

:: Create auto_start.bat (using the new aider config)
(
    echo @echo off
    echo title Auto Start - %PROJECT_NAME%
    echo cd /d "%%~dp0"
    echo.
    echo :: Start both services
    echo start "Flask Server" cmd /k run_dev_server.bat
    echo timeout /t 2 /nobreak ^>nul
    echo start "Aider Chat" cmd /k start_aider.bat
    echo.
    echo exit
) > auto_start.bat

:: Create README.md
(
    echo # %PROJECT_NAME%
    echo.
    echo A Flask web application created with automated setup script.
    echo.
    echo ## Quick Start
    echo.
    echo 1. Run `quick_start.bat` to start both Flask server and Aider
    echo 2. Flask server will be available at http://localhost:5000
    echo 3. Use Aider to develop your application with AI assistance
    echo.
    echo ## Manual Commands
    echo.
    echo - **Run Flask server only:** `run_dev_server.bat`
    echo - **Start Aider only:** `start_aider.bat`
    echo - **Install new packages:** Activate venv first, then `pip install package-name`
    echo.
    echo ## Project Structure
    echo.
    echo ```
    echo %PROJECT_NAME%/
    echo ├── app.py              # Main Flask application
    echo ├── templates/          # HTML templates
    echo │   └── index.html      # Homepage template
    echo ├── venv/               # Virtual environment
    echo ├── requirements.txt    # Python dependencies
    echo ├── aider.conf.yml      # Aider's configuration
    echo ├── litellm.yml         # LiteLLM's model configuration
    echo └── .gitignore          # Git ignore file
    echo ```
) > README.md

:: Create .env file for API keys
if not "!API_KEY!"=="" (
    echo Creating .env file with your API key...
    (
        echo # API Configuration
        echo !ENV_VAR!=!API_KEY!
        echo AIDER_MODEL=!DEFAULT_MODEL!
        echo.
        echo # Backup keys ^(uncomment to use^)
        if not "!ENV_VAR!"=="OPENAI_API_KEY" echo # OPENAI_API_KEY=your-openai-key
        if not "!ENV_VAR!"=="ANTHROPIC_API_KEY" echo # ANTHROPIC_API_KEY=your-anthropic-key
        if not "!ENV_VAR!"=="GEMINI_API_KEY" echo # GEMINI_API_KEY=your-gemini-key
    ) > .env
) else (
    echo Creating .env template file...
    (
        echo # API Keys for Aider
        echo # Uncomment and add the key for your preferred provider:
        echo.
        echo # For OpenAI ^(GPT-4, GPT-3.5, etc^)
        echo OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
        echo.
        echo # For Anthropic ^(Claude^)
        echo ANTHROPIC_API_KEY=your-anthropic-api-key-here
        echo.
        echo # For Google AI ^(Gemini^)
        echo GEMINI_API_KEY=your-google-ai-api-key-here
    ) > .env
)

:: ==============================================
:: FINAL COMMIT & INSTRUCTIONS
:: ==============================================
echo Committing all files to Git...
git add .
git commit -m "Initial Flask project setup with Aider and LiteLLM integration"

:: Deactivate virtual environment
call deactivate

echo.
echo ========================================
echo              SUCCESS!
echo ========================================
echo Your Flask project '%PROJECT_NAME%' is ready!
echo.
echo Location: %CD%
echo.
if defined API_KEY (
    echo API KEY: Configured for !ENV_VAR!
    echo Default Model: !DEFAULT_MODEL!
    echo.
)
echo --- QUICK START ---
echo Double-click "quick_start.bat" to launch everything!
echo.
echo --- AVAILABLE SCRIPTS ---
echo - quick_start.bat: Launch with .env settings
echo - run_dev_server.bat: Flask server only
echo - start_aider.bat: Aider only
echo.
echo --- HOW TO USE ---
echo 1. Navigate to '%PROJECT_NAME%' folder
echo 2. Double-click "quick_start.bat"
echo 3. Tell Aider what to build in the second window!
echo.
if not defined API_KEY (
    echo NOTE: No API key configured.
    echo Add one to .env file or Aider will prompt you.
    echo.
)
pause