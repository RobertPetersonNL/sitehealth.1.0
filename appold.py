import os
import logging
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import WebDriverException
import urllib3
import asyncio

app = Flask(__name__)
socketio = SocketIO(app)

# Configure logging
logging.basicConfig(level=logging.INFO, filename='website_health.log', filemode='a',
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Load websites from config
from config import WEBSITES

print("Loaded websites:", WEBSITES)  # Debugging print statement

website_status = {website: {'domain': website, 'online': False, 'error': None, 'screenshot': None, 'last_checked': None} for website in WEBSITES}
executor = ThreadPoolExecutor(max_workers=4)

def load_cached_data():
    if os.path.exists('website_status_cache.json'):
        with open('website_status_cache.json', 'r') as f:
            return json.load(f)
    return [{'domain': website, 'online': False, 'error': None, 'screenshot': None, 'last_checked': None} for website in WEBSITES]

def save_cached_data(data):
    with open('website_status_cache.json', 'w') as f:
        json.dump(data, f)

def sync_take_screenshot(domain):
    screenshot_path = os.path.join('static', 'screenshots', f'{domain}.png')
    if os.path.exists(screenshot_path):
        return screenshot_path

    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)

    try:
        driver.get(f"http://{domain}")
        driver.set_window_size(1920, 1080)
        driver.save_screenshot(screenshot_path)
        print(f"Screenshot saved for {domain} at {screenshot_path}")  # Debugging
        return screenshot_path
    except WebDriverException as e:
        logging.error(f"Error taking screenshot for {domain}: {e}")
        return None
    finally:
        driver.quit()

async def take_screenshot(domain):
    loop = asyncio.get_event_loop()
    screenshot_path = await loop.run_in_executor(executor, sync_take_screenshot, domain)
    return screenshot_path

async def check_website(domain):
    result = {
        'domain': domain,
        'online': False,
        'error': None,
        'screenshot': None,
        'last_checked': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

    print(f"Checking website: {domain}")  # Debugging
    http = urllib3.PoolManager()
    try:
        response = http.request('GET', f"http://{domain}", timeout=10)
        print(f"HTTP status code for {domain}: {response.status}")  # Debugging
        if response.status == 200:
            result['online'] = True
            screenshot_path = f'/static/screenshots/{domain}.png'
            if os.path.exists(screenshot_path[1:]):  # Remove leading '/' for os.path.exists check
                result['screenshot'] = screenshot_path
            else:
                screenshot = await take_screenshot(domain)
                if screenshot:
                    result['screenshot'] = screenshot
        else:
            result['error'] = f"HTTP status code: {response.status}"
    except urllib3.exceptions.HTTPError as e:
        result['error'] = f"HTTP error: {e}"
    except Exception as e:
        result['error'] = f"General error: {e}"
    
    website_status[domain] = result
    print(f"Result for {domain}: {result}")  # Debugging
    return result

async def run_checks():
    results = []
    for website in WEBSITES:
        result = await check_website(website)
        results.append(result)
        socketio.emit('update', {'data': [result]})
        print(f"Check result: {result}")  # Debugging
    save_cached_data(results)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/initial_data')
def initial_data():
    return jsonify(list(website_status.values()))

@socketio.on('start_check')
def start_check():
    print("Received start_check event")  # Debugging
    asyncio.run(run_checks())
    print("Checks started")

@socketio.on('add_website')
def add_website(data):
    new_website = data['url']
    if new_website not in WEBSITES:
        WEBSITES.append(new_website)
        website_status[new_website] = {'domain': new_website, 'online': False, 'error': None, 'screenshot': None, 'last_checked': None}
        print(f"Added new website: {new_website}")
    else:
        print(f"Website {new_website} already exists")

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5001)