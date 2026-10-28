"""Real elapsed-time check with a frozen Chromium page (no fake clock)."""
import json
import math
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context()
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5173', wait_until='networkidle')
    page.locator('header select').select_option('en')
    page.get_by_role('checkbox', name='Sound', exact=True).uncheck()
    page.get_by_role('spinbutton', name='Focus', exact=True).fill('5')
    page.get_by_role('button', name='Start', exact=True).click()
    initial = page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")
    deadline = initial['timer']['endAt']
    other = context.new_page()
    other.goto('about:blank')
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
    assert not errors
    result = {'result': 'PASS', 'browser': browser.version,
              'method': 'Isolated Edge; second tab plus CDP frozen page lifecycle; real elapsed time, no clock fast-forward',
              'elapsed_seconds': round(time.monotonic() - start, 2),
              'remaining_seconds': remaining, 'timestamp_expected': expected,
              'sessions': len(state['sessions']), 'pageerrors': errors}
    Path('docs/acceptance/background.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)
    browser.close()
