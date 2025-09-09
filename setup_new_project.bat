echo     ^<title^>%PROJECT_NAME%^</title^>
        echo     ^<meta charset="UTF-8"^>
        echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
        echo ^</head^>
        echo ^<body^>
        echo     ^<h1^>Welcome to %PROJECT_NAME%^</h1^>
        echo     ^<p^>Your Flask app is running!^</p^>
        echo ^</body^>
        echo ^</html^>
    ) > templates\index.html
)

:: Initialize git
git init >nul 2>&1
git config user.name "%DEFAULT_GIT_NAME%" >nul 2>&1
git config user.email "%DEFAULT_GIT_EMAIL%" >nul 2>&1
git add . >nul 2>&1
git commit -m "Initial commit: %PROJECT_NAME%" >nul 2>&1

:: Create diagnostic tools
call :create_diagnostic_tools

:: Create folder analysis tools
call :create_folder_analysis_tools

:: Success message
echo.
echo =====================================
echo   Project Created Successfully!
echo =====================================
echo.
echo Project: %PROJECT_NAME%
echo Type: %APP_TYPE_NAME%
echo Location: %CD%
echo.
echo Next steps:
echo 1. Run: run_dev.bat
echo 2. Test: run_tests.bat
echo 3. AI Help: start_aider.bat
echo 4. Fix issues: fix_project.bat
echo.

:: Open in VS Code if available
if "%HAS_VSCODE%"=="1" (
    set /p OPEN_VSCODE=Open in VS Code? (y/N): 
    if /i "!OPEN_VSCODE!"=="y" (
        start "" code .
    )
)

echo.
echo Thank you for using Ultimate Vibe Coder!
pause
exit /b 0

:: ==================== MAIN FILE CREATION ====================

:create_main_file
if "%PROJECT_TYPE%"=="1" call :create_flask_app
if "%PROJECT_TYPE%"=="2" call :create_fastapi_app
if "%PROJECT_TYPE%"=="3" call :create_discord_bot
if "%PROJECT_TYPE%"=="4" call :create_streamlit_app
if "%PROJECT_TYPE%"=="5" call :create_cli_app
if "%PROJECT_TYPE%"=="6" call :create_basic_app
goto :eof

:create_flask_app
(
    echo from flask import Flask, render_template
    echo from flask_sqlalchemy import SQLAlchemy
    echo from dotenv import load_dotenv
    echo import os
    echo.
    echo load_dotenv()
    echo.
    echo app = Flask(__name__)
    echo app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key')
    echo app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    echo app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    echo.
    echo db = SQLAlchemy(app)
    echo.
    echo @app.route('/')
    echo def index():
    echo     return render_template('index.html')
    echo.
    echo @app.route('/api/health')
    echo def health():
    echo     return {'status': 'healthy', 'message': '%PROJECT_NAME% is running'}
    echo.
    echo if __name__ == '__main__':
    echo     with app.app_context():
    echo         db.create_all()
    echo     app.run(debug=True, host='0.0.0.0', port=5000)
) > %MAIN_FILE%
goto :eof

:create_fastapi_app
(
    echo from fastapi import FastAPI
    echo from fastapi.middleware.cors import CORSMiddleware
    echo from dotenv import load_dotenv
    echo import uvicorn
    echo.
    echo load_dotenv()
    echo.
    echo app = FastAPI(title="%PROJECT_NAME%", version="1.0.0")
    echo.
    echo app.add_middleware(
    echo     CORSMiddleware,
    echo     allow_origins=["*"],
    echo     allow_credentials=True,
    echo     allow_methods=["*"],
    echo     allow_headers=["*"]
    echo )
    echo.
    echo @app.get("/")
    echo async def root():
    echo     return {"message": "Welcome to %PROJECT_NAME% API!"}
    echo.
    echo @app.get("/health")
    echo async def health():
    echo     return {"status": "healthy"}
    echo.
    echo if __name__ == "__main__":
    echo     uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
) > %MAIN_FILE%
goto :eof

:create_discord_bot
(
    echo import discord
    echo from discord.ext import commands
    echo from dotenv import load_dotenv
    echo import os
    echo.
    echo load_dotenv()
    echo.
    echo # Bot configuration
    echo intents = discord.Intents.default()
    echo intents.message_content = True
    echo.
    echo bot = commands.Bot(
    echo     command_prefix='!',
    echo     description='%PROJECT_NAME% Discord Bot',
    echo     intents=intents
    echo )
    echo.
    echo @bot.event
    echo async def on_ready():
    echo     print(f'{bot.user} has connected to Discord!')
    echo     print(f'Bot is in {len(bot.guilds)} servers')
    echo.
    echo @bot.command(name='hello')
    echo async def hello(ctx):
    echo     """Say hello to the bot"""
    echo     await ctx.send(f'Hello {ctx.author.name}! Welcome to %PROJECT_NAME%!')
    echo.
    echo @bot.command(name='ping')
    echo async def ping(ctx):
    echo     """Check bot latency"""
    echo     await ctx.send(f'Pong! {round(bot.latency * 1000)}ms')
    echo.
    echo @bot.command(name='info')
    echo async def bot_info(ctx):
    echo     """Get bot information"""
    echo     embed = discord.Embed(title="%PROJECT_NAME%", color=0x00ff00)
    echo     embed.add_field(name="Servers", value=len(bot.guilds), inline=True)
    echo     embed.add_field(name="Users", value=len(bot.users), inline=True)
    echo     embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms", inline=True)
    echo     await ctx.send(embed=embed)
    echo.
    echo if __name__ == '__main__':
    echo     token = os.getenv('DISCORD_TOKEN')
    echo     if not token:
    echo         print("ERROR: DISCORD_TOKEN not found in .env file")
    echo         print("Please add your bot token to the .env file")
    echo         print("Get your token from: https://discord.com/developers/applications")
    echo     else:
    echo         try:
    echo             bot.run(token)
    echo         except discord.LoginFailure:
    echo             print("ERROR: Invalid bot token")
    echo         except Exception as e:
    echo             print(f"ERROR: {e}")
) > %MAIN_FILE%
goto :eof

:create_streamlit_app
(
    echo import streamlit as st
    echo import pandas as pd
    echo import numpy as np
    echo import plotly.express as px
    echo.
    echo st.set_page_config(page_title="%PROJECT_NAME%", page_icon="📊")
    echo.
    echo st.title("📊 %PROJECT_NAME%")
    echo st.write("Your data dashboard is ready!")
    echo.
    echo # Sample data
    echo data = pd.DataFrame({
    echo     'x': range(10),
    echo     'y': np.random.randn(10).cumsum()
    echo })
    echo.
    echo st.subheader("Sample Chart")
    echo fig = px.line(data, x='x', y='y')
    echo st.plotly_chart(fig)
    echo.
    echo st.subheader("Sample Data")
    echo st.dataframe(data)
) > %MAIN_FILE%
goto :eof

:create_cli_app
(
    echo import click
    echo from rich.console import Console
    echo from rich import print as rprint
    echo.
    echo console = Console()
    echo.
    echo @click.group()
    echo def cli():
    echo     """Welcome to %PROJECT_NAME% CLI"""
    echo     pass
    echo.
    echo @cli.command()
    echo @click.option('--name', default='World', help='Name to greet')
    echo def hello(name):
    echo     """Say hello"""
    echo     rprint(f"[bold green]Hello {name}![/bold green]")
    echo.
    echo @cli.command()
    echo def status():
    echo     """Show status"""
    echo     rprint("[bold blue]%PROJECT_NAME% is running![/bold blue]")
    echo.
    echo if __name__ == '__main__':
    echo     cli()
) > %MAIN_FILE%
goto :eof

:create_basic_app
(
    echo """
    echo %PROJECT_NAME% - Basic Python Application
    echo """
    echo from dotenv import load_dotenv
    echo import os
    echo.
    echo load_dotenv()
    echo.
    echo def main():
    echo     print("Welcome to %PROJECT_NAME%!")
    echo     print("This is a basic Python application.")
    echo     print("Edit this file to add your functionality.")
    echo.
    echo if __name__ == "__main__":
    echo     main()
) > %MAIN_FILE%
goto :eof

:: ==================== DIAGNOSTIC TOOLS ====================

:create_diagnostic_tools
echo Creating diagnostic tools...

:: Main diagnostic script
(
    echo @echo off
    echo title Project Diagnostics - %PROJECT_NAME%
    echo cd /d "%%~dp0"
    echo.
    echo ================================================
    echo           PROJECT DIAGNOSTIC TOOL
    echo ================================================
    echo.
    echo What type of issue are you experiencing?
    echo.
    echo [1] Project won't run
    echo [2] Import/dependency errors
    echo [3] Discord bot issues
    echo [4] Database problems
    echo [5] Git issues
    echo [6] Analyze existing project folder
    echo [7] Full project health check
    echo [0] Exit
    echo.
    echo ================================================
    echo.
    echo Current project: %PROJECT_NAME%
    echo.
    echo ================================================
    echo.
    echo.
    set /p DIAG_CHOICE=Choose diagnostic (0-7): 
    echo.
    if "%%DIAG_CHOICE%%"=="1" call :fix_wont_run
    if "%%DIAG_CHOICE%%"=="2" call :fix_dependencies
    if "%%DIAG_CHOICE%%"=="3" call :fix_discord_bot
    if "%%DIAG_CHOICE%%"=="4" call :fix_database
    if "%%DIAG_CHOICE%%"=="5" call :fix_git
    if "%%DIAG_CHOICE%%"=="6" call :analyze_folder
    if "%%DIAG_CHOICE%%"=="7" call :health_check
    if "%%DIAG_CHOICE%%"=="0" exit
    echo.
    echo Diagnostic complete. Run again if needed.
    pause
) > fix_project.bat

:: Create the diagnostic functions as separate scripts
call :create_fix_scripts

goto :eof

:create_fix_scripts
:: Won't run fixer
(
    echo @echo off
    echo title Fix Project Won't Run
    echo echo =====================================
    echo echo     PROJECT WON'T RUN FIXER
    echo echo =====================================
    echo echo.
    echo echo Diagnosing why project won't start...
    echo echo.
    echo.
    echo :: Check virtual environment
    echo if not exist "venv" (
    echo     echo ISSUE: No virtual environment found
    echo     echo FIXING: Creating virtual environment...
    echo     python -m venv venv
    echo     echo FIXED: Virtual environment created
    echo ) else (
    echo     echo OK: Virtual environment found
    echo )
    echo echo.
    echo.
    echo :: Check if we can activate venv
    echo echo Testing virtual environment activation...
    echo call "venv\Scripts\activate.bat" 2^>nul
    echo if errorlevel 1 (
    echo     echo ISSUE: Cannot activate virtual environment
    echo     echo FIXING: Recreating virtual environment...
    echo     rmdir /s /q venv 2^>nul
    echo     python -m venv venv
    echo     call "venv\Scripts\activate.bat"
    echo     echo FIXED: Virtual environment recreated
    echo ) else (
    echo     echo OK: Virtual environment activates successfully
    echo )
    echo echo.
    echo.
    echo :: Check requirements
    echo if not exist "requirements.txt" (
    echo     echo ISSUE: No requirements.txt found
    echo     echo FIXING: Creating basic requirements.txt...
    echo     echo python-dotenv ^> requirements.txt
    echo     echo FIXED: Basic requirements.txt created
    echo ) else (
    echo     echo OK: requirements.txt found
    echo )
    echo echo.
    echo.
    echo :: Install/update packages
    echo echo Installing/updating packages...
    echo pip install --upgrade pip ^>nul 2^>^&1
    echo pip install -r requirements.txt ^>nul 2^>^&1
    echo if errorlevel 1 (
    echo     echo WARNING: Some packages may have failed to install
    echo     echo Try running: pip install -r requirements.txt
    echo ) else (
    echo     echo OK: Packages installed successfully
    echo )
    echo echo.
    echo.
    echo :: Check main file
    echo set MAIN_FILES=app.py main.py api.py bot.py dashboard.py cli.py run.py server.py
    echo set FOUND_MAIN=
    echo for %%%%f in (%%MAIN_FILES%%) do (
    echo     if exist "%%%%f" (
    echo         set FOUND_MAIN=%%%%f
    echo         echo OK: Found main file: %%%%f
    echo         goto test_run
    echo     )
    echo )
    echo echo.
    echo echo ISSUE: No main file found
    echo echo FIXING: Creating basic main.py...
    echo echo print("Hello from fixed project!"^) ^> main.py
    echo set FOUND_MAIN=main.py
    echo echo FIXED: Created main.py
    echo echo.
    echo.
    echo :test_run
    echo echo Testing if project runs...
    echo python %%FOUND_MAIN%% ^>nul 2^>^&1
    echo if errorlevel 1 (
    echo     echo ISSUE: Project still has errors
    echo     echo Running with error output:
    echo     echo ----------------------------------------
    echo     python %%FOUND_MAIN%%
    echo     echo ----------------------------------------
    echo ) else (
    echo     echo SUCCESS: Project runs without errors!
    echo )
    echo echo.
    echo echo Diagnosis complete.
    echo pause
) > scripts\fix_wont_run.bat

:: Dependencies fixer
(
    echo @echo off
    echo title Fix Dependencies
    echo echo =====================================
    echo echo      DEPENDENCY FIXER
    echo echo =====================================
    echo echo.
    echo echo Analyzing import errors and missing packages...
    echo echo.
    echo.
    echo call "venv\Scripts\activate.bat" 2^>nul ^|^| (
    echo     echo Creating virtual environment...
    echo     python -m venv venv
    echo     call "venv\Scripts\activate.bat"
    echo )
    echo echo.
    echo.
    echo :: Scan for imports in Python files
    echo echo Scanning Python files for imports...
    echo if exist "*.py" (
    echo     echo Found Python files, analyzing imports...
    echo     
    echo     :: Check for common packages and add to requirements
    echo     echo # Auto-detected requirements ^> requirements_detected.txt
    echo     findstr /s /i "import requests\|from requests" "*.py" ^>nul 2^>^&1 ^&^& echo requests ^>^> requirements_detected.txt
    echo     findstr /s /i "import flask\|from flask" "*.py" ^>nul 2^>^&1 ^&^& echo flask ^>^> requirements_detected.txt
    echo     findstr /s /i "import fastapi\|from fastapi" "*.py" ^>nul 2^>^&1 ^&^& echo fastapi ^>^> requirements_detected.txt
    echo     findstr /s /i "import discord\|from discord" "*.py" ^>nul 2^>^&1 ^&^& echo discord.py ^>^> requirements_detected.txt
    echo     findstr /s /i "import pandas\|from pandas" "*.py" ^>nul 2^>^&1 ^&^& echo pandas ^>^> requirements_detected.txt
    echo     findstr /s /i "import numpy\|from numpy" "*.py" ^>nul 2^>^&1 ^&^& echo numpy ^>^> requirements_detected.txt
    echo     findstr /s /i "import streamlit\|import st" "*.py" ^>nul 2^>^&1 ^&^& echo streamlit ^>^> requirements_detected.txt
    echo     findstr /s /i "import click\|from click" "*.py" ^>nul 2^>^&1 ^&^& echo click ^>^> requirements_detected.txt
    echo     findstr /s /i "from rich" "*.py" ^>nul 2^>^&1 ^&^& echo rich ^>^> requirements_detected.txt
    echo     findstr /s /i "import sqlalchemy\|from sqlalchemy" "*.py" ^>nul 2^>^&1 ^&^& echo sqlalchemy ^>^> requirements_detected.txt
    echo     findstr /s /i "import uvicorn" "*.py" ^>nul 2^>^&1 ^&^& echo uvicorn ^>^> requirements_detected.txt
    echo     findstr /s /i "import plotly\|from plotly" "*.py" ^>nul 2^>^&1 ^&^& echo plotly ^>^> requirements_detected.txt
    echo     echo python-dotenv ^>^> requirements_detected.txt
    echo     
    echo     if exist "requirements_detected.txt" (
    echo         echo.
    echo         echo Detected packages:
    echo         type requirements_detected.txt
    echo         echo.
    echo         echo Installing detected packages...
    echo         pip install -r requirements_detected.txt
    echo         echo.
    echo         echo Merging with existing requirements...
    echo         if exist "requirements.txt" (
    echo             type requirements.txt ^>^> requirements_detected.txt
    echo         )
    echo         move requirements_detected.txt requirements.txt ^>nul
    echo         echo Updated requirements.txt
    echo     )
    echo ) else (
    echo     echo No Python files found to analyze
    echo )
    echo echo.
    echo.
    echo echo Checking for package conflicts...
    echo pip check 2^>nul ^|^| (
    echo     echo Found package conflicts, attempting to resolve...
    echo     pip install --upgrade pip
    echo     pip install -r requirements.txt --force-reinstall --no-deps
    echo     pip install -r requirements.txt
    echo )
    echo echo.
    echo echo Dependency check complete.
    echo pause
) > scripts\fix_dependencies.bat

:: Discord bot specific fixer
(
    echo @echo off
    echo title Fix Discord Bot
    echo echo =====================================
    echo echo       DISCORD BOT FIXER
    echo echo =====================================
    echo echo.
    echo echo Diagnosing Discord bot issues...
    echo echo.
    echo.
    echo call "venv\Scripts\activate.bat" 2^>nul ^|^| (
    echo     echo Creating virtual environment...
    echo     python -m venv venv
    echo     call "venv\Scripts\activate.bat"
    echo )
    echo echo.
    echo.
    echo :: Check discord.py installation
    echo echo Checking discord.py installation...
    echo pip show discord.py ^>nul 2^>^&1
    echo if errorlevel 1 (
    echo     echo ISSUE: discord.py not installed
    echo     echo FIXING: Installing discord.py...
    echo     pip install discord.py
    echo     echo FIXED: discord.py installed
    echo ) else (
    echo     echo OK: discord.py is installed
    echo     pip show discord.py ^| findstr Version
    echo )
    echo echo.
    echo.
    echo :: Check for bot token
    echo echo Checking bot configuration...
    echo if exist ".env" (
    echo     findstr /i "DISCORD_TOKEN" .env ^>nul
    echo     if errorlevel 1 (
    echo         echo ISSUE: DISCORD_TOKEN not found in .env
    echo         echo FIXING: Adding DISCORD_TOKEN placeholder...
    echo         echo DISCORD_TOKEN=your_discord_bot_token_here ^>^> .env
    echo         echo FIXED: Added DISCORD_TOKEN to .env
    echo         echo.
    echo         echo IMPORTANT: You need to:
    echo         echo 1. Go to https://discord.com/developers/applications
    echo         echo 2. Create a new application
    echo         echo 3. Go to Bot section and create a bot
    echo         echo 4. Copy the token and replace 'your_discord_bot_token_here' in .env
    echo     ) else (
    echo         echo OK: DISCORD_TOKEN found in .env
    echo     )
    echo ) else (
    echo     echo ISSUE: No .env file found
    echo     echo FIXING: Creating .env with Discord token placeholder...
    echo     echo DISCORD_TOKEN=your_discord_bot_token_here ^> .env
    echo     echo FIXED: Created .env file
    echo )
    echo echo.
    echo.
    echo :: Check bot file
    echo set BOT_FILES=bot.py main.py app.py
    echo set FOUND_BOT=
    echo for %%%%f in (%%BOT_FILES%%) do (
    echo     if exist "%%%%f" (
    echo         findstr /i "discord\|bot" "%%%%f" ^>nul
    echo         if not errorlevel 1 (
    echo             set FOUND_BOT=%%%%f
    echo             echo OK: Found bot file: %%%%f
    echo             goto check_bot_code
    echo         )
    echo     )
    echo )
    echo echo.
    echo echo ISSUE: No Discord bot file found
    echo echo FIXING: Creating basic bot.py...
    echo (
    echo     echo import discord
    echo     echo from discord.ext import commands
    echo     echo import os
    echo     echo from dotenv import load_dotenv
    echo     echo.
    echo     echo load_dotenv()
    echo     echo.
    echo     echo intents = discord.Intents.default()
    echo     echo intents.message_content = True
    echo     echo bot = commands.Bot(command_prefix='!', intents=intents)
    echo     echo.
    echo     echo @bot.event
    echo     echo async def on_ready():
    echo     echo     print(f'{bot.user} is ready!')
    echo     echo.
    echo     echo @bot.command()
    echo     echo async def ping(ctx):
    echo     echo     await ctx.send('Pong!')
    echo     echo.
    echo     echo bot.run(os.getenv('DISCORD_TOKEN'))
    echo ) ^> bot.py
    echo set FOUND_BOT=bot.py
    echo echo FIXED: Created basic bot.py
    echo echo.
    echo.
    echo :check_bot_code
    echo echo Analyzing bot code for common issues...
    echo.
    echo :: Check for intents
    echo findstr /i "intents" "%%FOUND_BOT%%" ^>nul
    echo if errorlevel 1 (
    echo     echo WARNING: Bot may be missing intents configuration
    echo     echo Modern Discord bots require intents to be specified
    echo )
    echo.
    echo :: Check for message_content intent
    echo findstr /i "message_content.*True" "%%FOUND_BOT%%" ^>nul
    echo if errorlevel 1 (
    echo     echo WARNING: message_content intent may not be enabled
    echo     echo This is required for bots to read message content
    echo )
    echo.
    echo echo Bot diagnosis complete.
    echo echo.
    echo echo Common Discord bot issues:
    echo echo 1. Invalid token - Check your .env file
    echo echo 2. Missing intents - Enable in Discord Developer Portal
    echo echo 3. Bot not invited to server with correct permissions
    echo echo 4. Rate limiting - Bot making too many requests
    echo echo.
    echo pause
) > scripts\fix_discord_bot.bat

goto :eof

:: ==================== FOLDER ANALYSIS TOOLS ====================

:create_folder_analysis_tools
echo Creating folder analysis tools...

:: Create scripts directory
mkdir "scripts" 2>nul

:: Main folder analyzer
(
    echo @echo off
    echo title Folder Analysis Tool
    echo echo ================================================
    echo echo           FOLDER ANALYSIS TOOL
    echo echo ================================================
    echo echo.
    echo echo This tool analyzes any Python project folder
    echo echo and provides detailed diagnostics and fixes.
    echo echo.
    echo echo ================================================
    echo echo.
    echo.
    set /p ANALYZE_PATH=Enter folder path to analyze (or drag folder here): 
    echo.
    echo :: Remove quotes if drag-and-dropped
    set "ANALYZE_PATH=%%ANALYZE_PATH:"=%%"
    echo.
    echo if not exist "%%ANALYZE_PATH%%" (
    echo     echo ERROR: Folder does not exist: %%ANALYZE_PATH%%
    echo     pause
    echo     exit /b 1
    echo )
    echo.
    echo if not exist "%%ANALYZE_PATH%%\*" (
    echo     echo ERROR: This is not a folder: %%ANALYZE_PATH%%
    echo     pause
    echo     exit /b 1
    echo )
    echo.
    echo echo Analyzing: %%ANALYZE_PATH%%
    echo echo ================================================
    echo echo.
    echo.
    echo cd /d "%%ANALYZE_PATH%%"
    echo call :analyze_project_structure
    echo call :analyze_python_files  
    echo call :analyze_dependencies
    echo call :analyze_configuration
    echo call :analyze_git_status
    echo call :provide_recommendations
    echo echo.
    echo echo ================================================
    echo echo           ANALYSIS COMPLETE
    echo echo ================================================
    echo pause
    echo exit /b 0
    echo.
    echo :analyze_project_structure
    echo echo [1/6] ANALYZING PROJECT STRUCTURE...
    echo echo ================================================
    echo.
    echo :: Count different file types
    echo for /f %%%%i in ('dir /s /b "*.py" 2^^>nul ^| find /c /v ""') do set PY_COUNT=%%%%i
    echo for /f %%%%i in ('dir /s /b "*.txt" 2^^>nul ^| find /c /v ""') do set TXT_COUNT=%%%%i
    echo for /f %%%%i in ('dir /s /b "*.md" 2^^>nul ^| find /c /v ""') do set MD_COUNT=%%%%i
    echo for /f %%%%i in ('dir /s /b "*.json" 2^^>nul ^| find /c /v ""') do set JSON_COUNT=%%%%i
    echo.
    echo echo Python files: %%PY_COUNT%%
    echo echo Text files: %%TXT_COUNT%% 
    echo echo Markdown files: %%MD_COUNT%%
    echo echo JSON files: %%JSON_COUNT%%
    echo echo.
    echo :: Check for key files
    echo if exist "requirements.txt" (echo ✓ requirements.txt found) else (echo ✗ requirements.txt missing)
    echo if exist ".env" (echo ✓ .env found) else (echo ✗ .env missing)
    echo if exist ".gitignore" (echo ✓ .gitignore found) else (echo ✗ .gitignore missing)
    echo if exist "README.md" (echo ✓ README.md found) else (echo ✗ README.md missing)
    echo if exist "venv" (echo ✓ Virtual environment found) else (echo ✗ Virtual environment missing)
    echo if exist ".git" (echo ✓ Git repository found) else (echo ✗ Git repository missing)
    echo echo.
    echo goto :eof
    echo.
    echo :analyze_python_files
    echo echo [2/6] ANALYZING PYTHON CODE...
    echo echo ================================================
    echo.
    echo if %%PY_COUNT%% equ 0 (
    echo     echo No Python files found!
    echo     goto :eof
    echo )
    echo.
    echo :: Look for main files
    echo set MAIN_CANDIDATES=main.py app.py bot.py api.py run.py server.py cli.py dashboard.py
    echo echo Looking for main application files:
    echo for %%%%f in (%%MAIN_CANDIDATES%%) do (
    echo     if exist "%%%%f" echo ✓ Found: %%%%f
    echo )
    echo echo.
    echo.
    echo :: Check for common issues in Python files
    echo echo Checking for common code issues:
    echo findstr /s /i "print(" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ⚠ Found print statements (consider using logging)
    echo findstr /s /i "TODO\|FIXME\|HACK" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ⚠ Found TODO/FIXME comments
    echo findstr /s /i "password.*=.*['\"]" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ❌ Possible hardcoded passwords found
    echo findstr /s /i "api.*key.*=.*['\"]" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ❌ Possible hardcoded API keys found
    echo echo.
    echo.
    echo :: Detect project type
    echo echo Detecting project type:
    echo findstr /s /i "from flask import\|import flask" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ Flask web application detected
    echo findstr /s /i "from fastapi import\|import fastapi" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ FastAPI application detected  
    echo findstr /s /i "import discord\|from discord" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ Discord bot detected
    echo findstr /s /i "import streamlit\|import st" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ Streamlit dashboard detected
    echo findstr /s /i "import pandas\|import numpy" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ Data science project detected
    echo findstr /s /i "import click\|@click" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ✓ CLI application detected
    echo echo.
    echo goto :eof
    echo.
    echo :analyze_dependencies
    echo echo [3/6] ANALYZING DEPENDENCIES...
    echo echo ================================================
    echo.
    echo if exist "requirements.txt" (
    echo     echo Found requirements.txt:
    echo     for /f %%%%i in ('find /c /v "" ^^< requirements.txt') do echo   - %%%%i packages listed
    echo     echo.
    echo     echo Checking for common missing packages:
    echo     
    echo     :: Check if imports match requirements
    echo     if exist "*.py" (
    echo         findstr /s /i "import requests" "*.py" ^^>nul 2^^>^^&1 ^^&^^& (
    echo             findstr /i "requests" requirements.txt ^^>nul ^|^| echo   ⚠ Code uses 'requests' but not in requirements.txt
    echo         )
    echo         findstr /s /i "import flask" "*.py" ^^>nul 2^^>^^&1 ^^&^^& (
    echo             findstr /i "flask" requirements.txt ^^>nul ^|^| echo   ⚠ Code uses 'flask' but not in requirements.txt
    echo         )
    echo         findstr /s /i "import discord" "*.py" ^^>nul 2^^>^^&1 ^^&^^& (
    echo             findstr /i "discord" requirements.txt ^^>nul ^|^| echo   ⚠ Code uses 'discord' but not in requirements.txt
    echo         )
    echo         findstr /s /i "import pandas" "*.py" ^^>nul 2^^>^^&1 ^^&^^& (
    echo             findstr /i "pandas" requirements.txt ^^>nul ^|^| echo   ⚠ Code uses 'pandas' but not in requirements.txt
    echo         )
    echo         findstr /s /i "import numpy" "*.py" ^^>nul 2^^>^^&1 ^^&^^& (
    echo             findstr /i "numpy" requirements.txt ^^>nul ^|^| echo   ⚠ Code uses 'numpy' but not in requirements.txt
    echo         )
    echo     )
    echo ) else (
    echo     echo ❌ No requirements.txt found!
    echo     echo This makes it difficult to install dependencies.
    echo )
    echo echo.
    echo.
    echo :: Check virtual environment
    echo if exist "venv" (
    echo     echo ✓ Virtual environment directory found
    echo     if exist "venv\Scripts\python.exe" (
    echo         echo ✓ Python executable found in venv
    echo     ) else (
    echo         echo ❌ Virtual environment appears corrupted
    echo     )
    echo ) else (
    echo     echo ❌ No virtual environment found
    echo )
    echo echo.
    echo goto :eof
    echo.
    echo :analyze_configuration
    echo echo [4/6] ANALYZING CONFIGURATION...
    echo echo ================================================
    echo.
    echo :: Check .env file
    echo if exist ".env" (
    echo     echo Found .env file:
    echo     for /f %%%%i in ('find /c /v "" ^^< .env') do echo   - %%%%i configuration lines
    echo     
    echo     :: Check for common config issues
    echo     findstr /i "your.*key.*here\|placeholder\|changeme\|example" .env ^^>nul ^^&^^& echo   ⚠ Contains placeholder values
    echo     findstr /i "SECRET_KEY" .env ^^>nul ^|^| echo   ⚠ No SECRET_KEY found
    echo     
    echo     :: Check for Discord bot config
    echo     if exist "bot.py" (
    echo         findstr /i "DISCORD_TOKEN" .env ^^>nul ^|^| echo   ⚠ Discord bot detected but no DISCORD_TOKEN in .env
    echo     )
    echo ) else (
    echo     echo ❌ No .env file found
    echo     echo Configuration values may be hardcoded (security risk)
    echo )
    echo echo.
    echo.
    echo :: Check for other config files
    echo if exist "config.py" echo ✓ config.py found
    echo if exist "settings.py" echo ✓ settings.py found
    echo if exist "*.json" echo ✓ JSON config files found
    echo if exist "*.yaml" echo ✓ YAML config files found
    echo if exist "*.yml" echo ✓ YML config files found
    echo echo.
    echo goto :eof
    echo.
    echo :analyze_git_status
    echo echo [5/6] ANALYZING GIT STATUS...
    echo echo ================================================
    echo.
    echo if exist ".git" (
    echo     echo ✓ Git repository found
    echo     
    echo     :: Check git status
    echo     git status ^^>nul 2^^>^^&1 ^^&^^& (
    echo         echo ✓ Git repository is valid
    echo         
    echo         :: Check for uncommitted changes
    echo         git status --porcelain ^| find /v "" ^^>nul ^^&^^& (
    echo             echo ⚠ Uncommitted changes found:
    echo             git status --porcelain
    echo         ) ^|^| (
    echo             echo ✓ Working directory is clean
    echo         )
    echo         
    echo         :: Check remote
    echo         git remote -v ^^>nul 2^^>^^&1 ^^&^^& (
    echo             echo ✓ Remote repository configured
    echo         ) ^|^| (
    echo             echo ⚠ No remote repository configured
    echo         )
    echo     ) ^|^| (
    echo         echo ❌ Git repository appears corrupted
    echo     )
    echo ) else (
    echo     echo ❌ No git repository found
    echo     echo Consider initializing: git init
    echo )
    echo echo.
    echo goto :eof
    echo.
    echo :provide_recommendations
    echo echo [6/6] PROVIDING RECOMMENDATIONS...
    echo echo ================================================
    echo.
    echo echo IMMEDIATE FIXES NEEDED:
    echo echo ================================================
    echo.
    echo :: High priority issues
    echo if not exist "requirements.txt" echo ❌ HIGH: Create requirements.txt file
    echo if not exist "venv" echo ❌ HIGH: Create virtual environment
    echo if not exist ".env" echo ❌ HIGH: Create .env configuration file
    echo findstr /s /i "password.*=.*['\"]" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ❌ CRITICAL: Remove hardcoded passwords
    echo findstr /s /i "api.*key.*=.*['\"]" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ❌ CRITICAL: Remove hardcoded API keys
    echo.
    echo echo RECOMMENDED IMPROVEMENTS:
    echo echo ================================================
    echo.
    echo :: Medium priority issues  
    echo if not exist "README.md" echo ⚠ MEDIUM: Add README.md documentation
    echo if not exist ".gitignore" echo ⚠ MEDIUM: Add .gitignore file
    echo if not exist ".git" echo ⚠ MEDIUM: Initialize git repository
    echo findstr /s /i "print(" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ⚠ MEDIUM: Replace print statements with logging
    echo findstr /s /i "TODO\|FIXME" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo ⚠ MEDIUM: Address TODO/FIXME items
    echo.
    echo echo ENHANCEMENT SUGGESTIONS:
    echo echo ================================================
    echo.
    echo :: Low priority suggestions
    echo if not exist "tests" echo ⚠ LOW: Add tests directory and testing framework
    echo if %%PY_COUNT%% gtr 5 echo ⚠ LOW: Consider organizing code into modules/packages
    echo echo ⚠ LOW: Add type hints for better code documentation
    echo echo ⚠ LOW: Set up automated code formatting (black, flake8)
    echo echo ⚠ LOW: Add CI/CD pipeline for automated testing
    echo.
    echo echo QUICK FIX COMMANDS:
    echo echo ================================================
    echo.
    echo echo To fix the most critical issues, run these commands:
    echo echo.
    echo if not exist "venv" echo python -m venv venv
    echo if not exist "requirements.txt" echo pip freeze ^> requirements.txt
    echo if not exist ".env" echo echo SECRET_KEY=your-secret-key ^> .env
    echo if not exist ".gitignore" (
    echo     echo echo __pycache__/ ^> .gitignore
    echo     echo echo venv/ ^>^> .gitignore
    echo     echo echo .env ^>^> .gitignore
    echo )
    echo if not exist ".git" echo git init
    echo.
    echo goto :eof
) > scripts\analyze_folder.bat

:: Create additional helper scripts
(
    echo @echo off
    echo title Quick Project Fix
    echo echo =====================================
    echo echo     QUICK PROJECT FIXER
    echo echo =====================================
    echo echo.
    echo echo This will attempt to fix common issues automatically.
    echo echo.
    echo set /p CONFIRM=Continue with automatic fixes? (y/N): 
    echo if /i not "%%CONFIRM%%"=="y" exit /b 0
    echo echo.
    echo.
    echo echo Applying automatic fixes...
    echo echo.
    echo.
    echo :: Create virtual environment if missing
    echo if not exist "venv" (
    echo     echo Creating virtual environment...
    echo     python -m venv venv
    echo     echo ✓ Virtual environment created
    echo ) else (
    echo     echo ✓ Virtual environment already exists
    echo )
    echo echo.
    echo.
    echo :: Create basic requirements.txt if missing
    echo if not exist "requirements.txt" (
    echo     echo Creating basic requirements.txt...
    echo     echo python-dotenv ^> requirements.txt
    echo     
    echo     :: Add detected packages
    echo     if exist "*.py" (
    echo         findstr /s /i "import flask" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo flask ^>^> requirements.txt
    echo         findstr /s /i "import discord" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo discord.py ^>^> requirements.txt
    echo         findstr /s /i "import requests" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo requests ^>^> requirements.txt
    echo         findstr /s /i "import pandas" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo pandas ^>^> requirements.txt
    echo         findstr /s /i "import streamlit" "*.py" ^^>nul 2^^>^^&1 ^^&^^& echo streamlit ^>^> requirements.txt
    echo     )
    echo     echo ✓ Requirements.txt created
    echo ) else (
    echo     echo ✓ Requirements.txt already exists
    echo )
    echo echo.
    echo.
    echo :: Create .env if missing
    echo if not exist ".env" (
    echo     echo Creating .env file...
    echo     echo SECRET_KEY=change-this-secret-key ^> .env
    echo     echo DEBUG=True ^>^> .env
    echo     
    echo     :: Add Discord token if bot detected
    echo     if exist "bot.py" (
    echo         echo DISCORD_TOKEN=your_discord_bot_token_here ^>^> .env
    echo     )
    echo     echo ✓ .env file created
    echo ) else (
    echo     echo ✓ .env file already exists
    echo )
    echo echo.
    echo.
    echo :: Create .gitignore if missing
    echo if not exist ".gitignore" (
    echo     echo Creating .gitignore...
    echo     (
    echo         echo __pycache__/
    echo         echo *.pyc  
    echo         echo venv/
    echo         echo .env
    echo         echo *.log
    echo         echo .vscode/
    echo         echo *.db
    echo     ) ^> .gitignore
    echo     echo ✓ .gitignore created
    echo ) else (
    echo     echo ✓ .gitignore already exists
    echo )
    echo echo.
    echo.
    echo :: Install packages
    echo echo Installing/updating packages...
    echo call "venv\Scripts\activate.bat" 2^>nul
    echo pip install --upgrade pip ^>nul 2^>^&1
    echo pip install -r requirements.txt ^>nul 2^>^&1
    echo if errorlevel 1 (
    echo     echo ⚠ Some packages may have failed to install
    echo ) else (
    echo     echo ✓ Packages installed successfully
    echo )
    echo echo.
    echo.
    echo :: Initialize git if missing
    echo if not exist ".git" (
    echo     echo Initializing git repository...
    echo     git init ^>nul 2^>^&1
    echo     git add . ^>nul 2^>^&1
    echo     git commit -m "Initial commit - fixed project" ^>nul 2^>^&1
    echo     echo ✓ Git repository initialized
    echo ) else (
    echo     echo ✓ Git repository already exists
    echo )
    echo echo.
    echo.
    echo echo =====================================
    echo echo        FIXES APPLIED SUCCESSFULLY
    echo echo =====================================
    echo echo.
    echo echo Your project should now be in a better state.
    echo echo.
    echo echo Next steps:
    echo echo 1. Test your application
    echo echo 2. Update any placeholder values in .env
    echo echo 3. Add proper error handling to your code
    echo echo 4. Write tests for your functionality
    echo echo.
    echo pause
) > scripts\quick_fix.bat

:: Create comprehensive health check
(
    echo @echo off
    echo title Project Health Check
    echo echo ================================================
    echo echo           PROJECT HEALTH CHECK
    echo echo ================================================
    echo echo.
    echo echo Running comprehensive health check...
    echo echo.
    echo.
    echo set SCORE=0
    echo set MAX_SCORE=0
    echo.
    echo echo [1/8] Virtual Environment...
    echo set /a MAX_SCORE+=10
    echo if exist "venv" (
    echo     if exist "venv\Scripts\python.exe" (
    echo         echo ✓ Virtual environment is properly configured
    echo         set /a SCORE+=10
    echo     ) else (
    echo         echo ❌ Virtual environment exists but is corrupted
    echo     )
    echo ) else (
    echo     echo ❌ No virtual environment found
    echo )
    echo echo.
    echo.
    echo echo [2/8] Dependencies...
    echo set /a MAX_SCORE+=10
    echo if exist "requirements.txt" (
    echo     call "venv\Scripts\activate.bat" 2^>nul
    echo     pip check ^>nul 2^>^&1
    echo     if not errorlevel 1 (
    echo         echo ✓ All dependencies are satisfied
    echo         set /a SCORE+=10
    echo     ) else (
    echo         echo ❌ Dependency conflicts detected
    echo     )
    echo ) else (
    echo     echo ❌ No requirements.txt found
    echo )
    echo echo.
    echo.
    echo echo [3/8] Configuration...
    echo set /a MAX_SCORE+=10
    echo if exist ".env" (
    echo     findstr /i "placeholder\|changeme\|your.*key.*here" .env ^>nul
    echo     if errorlevel 1 (
    echo         echo ✓ Configuration appears properly set
    echo         set /a SCORE+=10
    echo     ) else (
    echo         echo ⚠ Configuration contains placeholder values
    echo         set /a SCORE+=5
    echo     )
    echo ) else (
    echo     echo ❌ No .env configuration file
    echo )
    echo echo.
    echo.
    echo echo [4/8] Code Quality...
    echo set /a MAX_SCORE+=10
    echo set CODE_ISSUES=0
    echo findstr /s /i "print(" "*.py" ^>nul 2^>^&1 ^&^& set /a CODE_ISSUES+=1
    echo findstr /s /i "password.*=" "*.py" ^>nul 2^>^&1 ^&^& set /a CODE_ISSUES+=3
    echo findstr /s /i "TODO\|FIXME" "*.py" ^>nul 2^>^&1 ^&^& set /a CODE_ISSUES+=1
    echo.
    echo if %%CODE_ISSUES%% equ 0 (
    echo     echo ✓ No obvious code quality issues
    echo     set /a SCORE+=10
    echo ) else if %%CODE_ISSUES%% equ 1 (
    echo     echo ⚠ Minor code quality issues found
    echo     set /a SCORE+=7
    echo ) else (
    echo     echo ❌ Multiple code quality issues found
    echo     set /a SCORE+=3
    echo )
    echo echo.
    echo.
    echo echo [5/8] Documentation...
    echo set /a MAX_SCORE+=10
    echo if exist "README.md" (
    echo     for /f %%%%i in ('find /c /v "" ^^< README.md') do set README_LINES=%%%%i
    echo     if %%README_LINES%% gtr 10 (
    echo         echo ✓ Good documentation found
    echo         set /a SCORE+=10
    echo     ) else (
    echo         echo ⚠ Basic documentation exists
    echo         set /a SCORE+=5
    echo     )
    echo ) else (
    echo     echo ❌ No README.md documentation
    echo )
    echo echo.
    echo.
    echo echo [6/8] Version Control...
    echo set /a MAX_SCORE+=10
    echo if exist ".git" (
    echo     git status ^>nul 2^>^&1
    echo     if not errorlevel 1 (
    echo         git status --porcelain ^| find /v "" ^>nul
    echo         if errorlevel 1 (
    echo             echo ✓ Git repository with clean working directory
    echo             set /a SCORE+=10
    echo         ) else (
    echo             echo ⚠ Git repository with uncommitted changes
    echo             set /a SCORE+=7
    echo         )
    echo     ) else (
    echo         echo ❌ Git repository is corrupted
    echo     )
    echo ) else (
    echo     echo ❌ No version control setup
    echo )
    echo echo.
    echo.
    echo echo [7/8] Testing...
    echo set /a MAX_SCORE+=10
    echo if exist "tests" (
    echo     if exist "test_*.py" (
    echo         call "venv\Scripts\activate.bat" 2^>nul
    echo         python -m pytest --version ^>nul 2^>^&1
    echo         if not errorlevel 1 (
    echo             echo ✓ Testing framework properly configured
    echo             set /a SCORE+=10
    echo         ) else (
    echo             echo ⚠ Test files exist but pytest not installed
    echo             set /a SCORE+=5
    echo         )
    echo     ) else (
    echo         echo ⚠ Tests directory exists but no test files
    echo         set /a SCORE+=3
    echo     )
    echo ) else (
    echo     echo ❌ No testing setup found
    echo )
    echo echo.
    echo.
    echo echo [8/8] Functionality Test...
    echo set /a MAX_SCORE+=10
    echo.
    echo :: Find main file and test if it runs
    echo set MAIN_FILES=main.py app.py bot.py api.py dashboard.py cli.py run.py
    echo set FOUND_MAIN=
    echo for %%%%f in (%%MAIN_FILES%%) do (
    echo     if exist "%%%%f" (
    echo         set FOUND_MAIN=%%%%f
    echo         goto test_main
    echo     )
    echo )
    echo echo ❌ No main application file found
    echo goto calculate_score
    echo.
    echo :test_main
    echo call "venv\Scripts\activate.bat" 2^>nul
    echo python -m py_compile "%%FOUND_MAIN%%" 2^>nul
    echo if not errorlevel 1 (
    echo     echo ✓ Main application file compiles without errors
    echo     set /a SCORE+=10
    echo ) else (
    echo     echo ❌ Main application file has syntax errors
    echo )
    echo.
    echo.
    echo :calculate_score
    echo echo ================================================
    echo echo              HEALTH SCORE
    echo echo ================================================
    echo echo.
    echo set /a PERCENTAGE=SCORE*100/MAX_SCORE
    echo echo Overall Score: %%SCORE%%/%%MAX_SCORE%% (%%PERCENTAGE%%%)
    echo echo.
    echo if %%PERCENTAGE%% geq 90 (
    echo     echo 🎉 EXCELLENT - Your project is in great shape!
    echo ) else if %%PERCENTAGE%% geq 70 (
    echo     echo ✓ GOOD - Your project is solid with minor improvements needed
    echo ) else if %%PERCENTAGE%% geq 50 (
    echo     echo ⚠ FAIR - Your project needs some attention
    echo ) else (
    echo     echo ❌ POOR - Your project needs significant improvements
    echo )
    echo echo.
    echo echo For detailed analysis and fixes, run: scripts\analyze_folder.bat
    echo echo For automatic fixes, run: scripts\quick_fix.bat
    echo echo.
    echo pause
) > scripts\health_check.bat

goto :eof @echo off
setlocal enabledelayedexpansion
title Ultimate Vibe Coder Setup v3.0

:: Configuration
set "SCRIPT_VERSION=3.0"
set "DEFAULT_GIT_NAME=YourUsername"
set "DEFAULT_GIT_EMAIL=your.email@example.com"

echo.
echo ================================================
echo    Ultimate Vibe Coder Setup v%SCRIPT_VERSION%
echo    "From idea to running code in 2 minutes"
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)
echo Python detected - OK

:: Check Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)
echo Git detected - OK

:: Check VS Code (optional)
code --version >nul 2>&1
if not errorlevel 1 (
    echo VS Code detected - OK
    set "HAS_VSCODE=1"
) else (
    echo VS Code not found (optional)
)

echo.

:: Get project info
:get_project_name
set /p PROJECT_NAME=Enter project name: 
if "%PROJECT_NAME%"=="" (
    echo Project name cannot be empty.
    goto get_project_name
)

if exist "%PROJECT_NAME%" (
    echo Directory "%PROJECT_NAME%" already exists.
    goto get_project_name
)

echo.
set /p PROJECT_IDEA=Describe your project in a few words: 

:: Vibe selection
echo.
echo =====================================
echo        PICK YOUR VIBE
echo =====================================
echo.
echo [1] FOCUS MODE - I know what I'm building
echo [2] EXPERIMENT MODE - Let me try ideas
echo [3] SHIP MODE - Build and deploy fast
echo [4] CREATIVE MODE - Make something cool
echo [5] LEARN MODE - Following tutorials
echo [6] BASIC MODE - Simple setup
echo.
set /p VIBE_MODE=What's your vibe today? (1-6): 

:: Project type selection
echo.
echo =====================================
echo       PROJECT TYPE
echo =====================================
echo.
echo [1] Flask Web App
echo [2] FastAPI REST API
echo [3] Discord Bot
echo [4] Data Dashboard (Streamlit)
echo [5] CLI Tool
echo [6] Basic Python Project
echo.
set /p PROJECT_TYPE=Choose project type (1-6): 

:: Set up project variables
if "%PROJECT_TYPE%"=="1" (
    set "APP_TYPE_NAME=Flask Web Application"
    set "MAIN_FILE=app.py"
    set "REQUIREMENTS=flask flask-sqlalchemy python-dotenv"
    set "IS_WEB=1"
)
if "%PROJECT_TYPE%"=="2" (
    set "APP_TYPE_NAME=FastAPI REST API"
    set "MAIN_FILE=api.py"
    set "REQUIREMENTS=fastapi uvicorn sqlalchemy python-dotenv"
)
if "%PROJECT_TYPE%"=="3" (
    set "APP_TYPE_NAME=Discord Bot"
    set "MAIN_FILE=bot.py"
    set "REQUIREMENTS=discord.py python-dotenv aiosqlite"
)
if "%PROJECT_TYPE%"=="4" (
    set "APP_TYPE_NAME=Data Dashboard"
    set "MAIN_FILE=dashboard.py"
    set "REQUIREMENTS=streamlit pandas plotly python-dotenv"
)
if "%PROJECT_TYPE%"=="5" (
    set "APP_TYPE_NAME=CLI Tool"
    set "MAIN_FILE=cli.py"
    set "REQUIREMENTS=click colorama rich python-dotenv"
)
if "%PROJECT_TYPE%"=="6" (
    set "APP_TYPE_NAME=Basic Python Project"
    set "MAIN_FILE=main.py"
    set "REQUIREMENTS=python-dotenv requests"
)

echo Selected: %APP_TYPE_NAME%
echo.

:: Create project
echo Creating project directory...
mkdir "%PROJECT_NAME%"
cd "%PROJECT_NAME%"

:: Create virtual environment
echo Creating virtual environment...
python -m venv venv
call "venv\Scripts\activate.bat"

:: Create requirements.txt
echo Creating requirements.txt...
(
    echo # Core requirements
    for %%R in (%REQUIREMENTS%) do echo %%R
    echo.
    echo # AI Development
    echo aider-chat
    echo litellm
    echo.
    echo # Code Quality
    echo black
    echo flake8
    echo pytest
) > requirements.txt

:: Install packages
echo Installing packages...
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

:: Create .env file
echo Creating .env file...
(
    echo # Environment Configuration
    echo SECRET_KEY=your-secret-key-here
    echo DEBUG=True
    echo.
    echo # AI Configuration
    echo OLLAMA_BASE_URL=http://localhost:11434
    echo LLAMA_MODEL=llama3
    echo.
    echo # API Keys (optional)
    echo OPENAI_API_KEY=your_openai_api_key_here
    if "%PROJECT_TYPE%"=="3" echo DISCORD_TOKEN=your_discord_bot_token_here
) > .env

:: Create .gitignore
echo Creating .gitignore...
(
    echo __pycache__/
    echo *.pyc
    echo venv/
    echo .env
    echo *.log
    echo .vscode/
    echo .idea/
    echo *.db
    echo *.sqlite
) > .gitignore

:: Create main application file
echo Creating main application file...
call :create_main_file

:: Create development scripts
echo Creating development scripts...

:: Run script
(
    echo @echo off
    echo cd /d "%%~dp0"
    echo call "venv\Scripts\activate.bat"
    echo echo Starting %PROJECT_NAME%...
    if "%PROJECT_TYPE%"=="1" (
        echo python %MAIN_FILE%
    ) else if "%PROJECT_TYPE%"=="2" (
        echo python %MAIN_FILE%
    ) else if "%PROJECT_TYPE%"=="4" (
        echo streamlit run %MAIN_FILE%
    ) else (
        echo python %MAIN_FILE%
    )
    echo pause
) > run_dev.bat

:: Test script
(
    echo @echo off
    echo cd /d "%%~dp0"
    echo call "venv\Scripts\activate.bat"
    echo echo Running tests...
    echo pytest tests/ -v
    echo pause
) > run_tests.bat

:: AI assistant script
(
    echo @echo off
    echo cd /d "%%~dp0"
    echo call "venv\Scripts\activate.bat"
    echo echo Starting AI Assistant...
    echo echo Install Ollama from https://ollama.ai
    echo echo Then run: ollama pull llama3
    echo echo.
    echo aider --model ollama/llama3
    echo pause
) > start_aider.bat

:: Create README
echo Creating README...
(
    echo # %PROJECT_NAME%
    echo.
    echo %PROJECT_IDEA%
    echo.
    echo ## Quick Start
    echo.
    echo 1. Run development server:
    echo    ```
    echo    run_dev.bat
    echo    ```
    echo.
    echo 2. Run tests:
    echo    ```
    echo    run_tests.bat
    echo    ```
    echo.
    echo 3. Start AI assistant:
    echo    ```
    echo    start_aider.bat
    echo    ```
    echo.
    echo ## Project Type
    echo %APP_TYPE_NAME%
    echo.
    echo ## Features
    echo - Virtual environment configured
    echo - AI development tools (Aider)
    echo - Testing framework (pytest)
    echo - Code quality tools (black, flake8)
    echo - Environment configuration
    echo.
    echo Built with Ultimate Vibe Coder v%SCRIPT_VERSION%
) > README.md

:: Create basic test structure
mkdir "tests"
(
    echo import pytest
    echo import sys
    echo import os
    echo.
    echo # Add parent directory to path
    echo sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    echo.
    echo def test_environment():
    echo     """Test that environment is working"""
    echo     assert sys.version_info.major == 3
    echo.
    echo def test_basic():
    echo     """Basic test"""
    echo     assert 1 + 1 == 2
) > tests\test_basic.py

:: Create project structure based on type
if "%IS_WEB%"=="1" (
    mkdir "templates"
    mkdir "static"
    
    :: Create basic HTML template
    (
        echo ^<!DOCTYPE html^>
        echo ^<html^>
        echo ^<head^>
        echo     ^<title^>%PROJECT_NAME%^</title^>
        echo