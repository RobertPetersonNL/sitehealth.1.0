# capture_screenshot.py

import asyncio
from pyppeteer import launch
import os

async def take_screenshot(url, path):
    browser = await launch(headless=True)
    page = await browser.newPage()
    await page.goto(url)
    await page.screenshot({'path': path})
    await browser.close()

if __name__ == '__main__':
    url = 'http://example.com'
    path = os.path.join('static', 'screenshots', 'screenshot.png')
    asyncio.get_event_loop().run_until_complete(take_screenshot(url, path))