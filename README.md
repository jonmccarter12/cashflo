# 

A Flask web application created with automated setup script.

## Quick Start

1. Run `quick_start.bat` to start both Flask server and Aider
2. Flask server will be available at http://localhost:5000
3. Use Aider to develop your application with AI assistance

## Manual Commands

- **Run Flask server only:** `run_dev_server.bat`
- **Start Aider only:** `start_aider.bat`
- **Install new packages:** Activate venv first, then `pip install package-name`

## Project Structure

```
/
├── app.py              # Main Flask application
├── templates/          # HTML templates
│   └── index.html      # Homepage template
├── venv/               # Virtual environment
├── requirements.txt    # Python dependencies
├── aider.conf.yml      # Aider's configuration
├── litellm.yml         # LiteLLM's model configuration
└── .gitignore          # Git ignore file
```
