"""Real elapsed-time check with a frozen Chromium page (no fake clock)."""
import argparse
import json
import re
import math
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--output', default='.artifacts/acceptance/local/background.json')
parser.add_argument('--with-reader', action='store_true', help='Keep a real FocusFlow reader tab open while the writer is frozen, then verify takeover')
args = parser.parse_args()

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context()
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.url, wait_until='networkidle')
    page.locator('header select').first.select_option('en')
    # Settings live behind the header icon; the main screen stays a timer.
    page.get_by_role('button', name='Open settings').click()
    dialog = page.get_by_role('dialog', name='Settings')
    dialog.locator('label').filter(has_text=re.compile(r'^Sound$')).click()
    dialog.get_by_role('spinbutton', name='Focus', exact=True).fill('5')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Start focus', exact=True).click()
    initial = page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")
    deadline = initial['timer']['endAt']
    other = context.new_page()
    other.goto(args.url if args.with_reader else 'about:blank', wait_until='networkidle')
    if args.with_reader:
        other.get_by_role('heading', name='This window is following your active window', exact=True).wait_for()
    other.bring_to_front()
    cdp = context.new_cdp_session(page)
    cdp.send('Page.setWebLifecycleState', {'state': 'frozen'})
    start = time.monotonic()
    print('Five-minute timer started; page frozen for 180 real seconds.', flush=True)
    time.sleep(180)
    cdp.send('Page.setWebLifecycleState', {'state': 'active'})
    page.bring_to_front()
    # Resuming a frozen tab triggers visibility/tick synchronization.
    page.wait_for_timeout(1200)
    label = page.locator('[aria-label$=" remaining"]').get_attribute('aria-label')
    minutes, seconds = map(int, label.split()[0].split(':'))
    remaining = minutes * 60 + seconds
    now = page.evaluate('Date.now()')
    expected = max(0, math.ceil((deadline - now) / 1000))
    assert abs(remaining - expected) <= 1, (remaining, expected)
    page.get_by_role('button', name='Pause', exact=True).click()
    state = page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")
    assert len(state['sessions']) == 1
    assert state['timer']['activeSessionId'] == initial['timer']['activeSessionId']
    if args.with_reader:
        other.get_by_role('heading', name='This window is following your active window', exact=True).wait_for()
        page.close()
        other.get_by_role('button', name='Resume focus', exact=True).wait_for()
        takeover = other.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")
        assert len(takeover['sessions']) == 1
        assert takeover['timer']['activeSessionId'] == initial['timer']['activeSessionId']
        assert takeover['timer']['status'] == 'paused'
    assert not errors
    result = {'result': 'PASS', 'browser': browser.version, 'url': args.url, 'reader_verified': args.with_reader,
              'method': 'Isolated Edge; second tab plus CDP frozen page lifecycle; real elapsed time, no clock fast-forward',
              'elapsed_seconds': round(time.monotonic() - start, 2),
              'remaining_seconds': remaining, 'timestamp_expected': expected,
              'sessions': len(state['sessions']), 'pageerrors': errors}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)
    browser.close()
