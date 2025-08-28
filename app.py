from flask import Flask, render_template
import webbrowser
from threading import Timer

app = Flask(__name__)

def open_browser():
    webbrowser.open('http://127.0.0.1:5000/')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Open browser after a short delay
    Timer(1.5, open_browser).start()
    app.run(debug=True, use_reloader=False)
