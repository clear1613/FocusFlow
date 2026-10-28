"""Chinese-first and English switching acceptance in isolated Edge contexts.

Uses a fixed set of sample tasks and script-set timestamps. Never opens a personal
browser profile. Production captures are written only when given a public URL.
"""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--output', default='docs/acceptance/language-local.json')
parser.add_argument('--screenshots-dir', default='docs/screenshots/local')
parser.add_argument('--expected-version', default='1.1.0')
args = parser.parse_args()
shots = Path(args.screenshots_dir)
shots.mkdir(parents=True, exist_ok=True)
results, errors = [], []


def read(page):
    return page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")


def layout(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
    control = page.locator('header select')
    box = control.bounding_box()
    assert box and box['width'] >= 44 and box['height'] >= 44
    assert box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width']


def open_settings(page):
    # Every call site below runs while the interface is Chinese.
    page.get_by_role('button', name='打开设置').click()
    return page.get_by_role('dialog', name='设置')


def language_workflow(page, name):
    expect(page.locator('html')).to_have_attribute('lang', 'zh-CN')
    expect(page.get_by_role('heading', name='今日概览', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='任务清单', exact=True)).to_be_visible()
    page.get_by_role('button', name='打开设置').click()
    expect(page.get_by_role('heading', name='设置', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('combobox', name='界面语言')).to_have_value('zh-CN')
    assert 'source of truth' not in page.locator('body').inner_text()
    open_settings(page)
    page.get_by_role('dialog', name='设置').locator('label').filter(has_text='声音提醒').click()
    page.keyboard.press('Escape')
    page.get_by_role('textbox', name='任务名称').fill('完成项目文档')
    page.get_by_role('button', name='添加', exact=True).click()
    page.locator('article').filter(has_text='完成项目文档').get_by_role('button').nth(1).click()
    page.get_by_role('button', name='开始专注', exact=True).click()
    page.clock.fast_forward(10_000)
    before = read(page)
    page.get_by_role('textbox', name='任务名称').fill('保留输入草稿')

    page.get_by_role('combobox', name='界面语言').select_option('en')
    expect(page.locator('html')).to_have_attribute('lang', 'en')
    expect(page.get_by_role('heading', name='Today', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Pause', exact=True)).to_be_visible()
    expect(page.get_by_role('textbox', name='Task name')).to_have_value('保留输入草稿')
    after = read(page)
    for key in ('tasks', 'sessions', 'activeTaskId'):
        assert after[key] == before[key], 'Switch changed ' + key
    # Ticks update runtime remaining time without writing storage. Saving the
    # preference captures those ten elapsed seconds while preserving the exact
    # deadline, running status and Session identity.
    assert after['timer'] == dict(before['timer'], remainingSeconds=1490)
    assert after['settings']['locale'] == 'en'
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('combobox', name='Interface language')).to_have_value('en')
    assert read(page)['timer']['activeSessionId'] == before['timer']['activeSessionId']

    # Keyboard changes the native selector without rebuilding the application.
    control = page.locator('header select')
    control.focus()
    control.press('Home')
    control.press('Enter')
    expect(page.locator('html')).to_have_attribute('lang', 'zh-CN')
    page.clock.fast_forward(after['timer']['remainingSeconds'] * 1000)
    expect(page.get_by_text('专注完成', exact=True)).to_be_visible()
    completed = read(page)
    assert len(completed['sessions']) == 1
    assert completed['sessions'][0]['status'] == 'completed'
    assert completed['tasks'][0]['completedPomodoros'] == 1
    page.get_by_role('combobox', name='界面语言').select_option('en')
    page.get_by_role('button', name='Start break', exact=True).click()
    page.clock.fast_forward(300_000)
    expect(page.get_by_text('Break complete', exact=True)).to_be_visible()

    page.get_by_role('combobox', name='Interface language').select_option('zh-CN')
    page.get_by_role('button', name='开始专注', exact=True).click()
    page.clock.fast_forward(180_000)
    page.get_by_role('button', name='暂停一下', exact=True).click()
    page.clock.fast_forward(5_000)
    layout(page)
    page.screenshot(path=str(shots / (name + '-zh-CN.png')), full_page=True)
    page.get_by_role('combobox', name='界面语言').select_option('en')
    layout(page)
    page.screenshot(path=str(shots / (name + '-en.png')), full_page=True)
    page.get_by_role('region', name='Pomodoro timer').get_by_role('button', name='End this round', exact=True).click()
    expect(page.get_by_role('dialog', name='Reset current timer?')).to_be_visible()
    page.keyboard.press('Escape')
    row = page.locator('article')
    row.get_by_role('button', name=re.compile('More actions for')).click()
    row.get_by_role('menuitem', name='Edit', exact=True).click()
    expect(page.get_by_role('dialog', name='Edit task')).to_be_visible()
    expect(page.get_by_role('textbox', name='Task name').last).to_be_focused()
    page.keyboard.press('Escape')
    page.get_by_role('combobox', name='Interface language').select_option('zh-CN')
    row.get_by_role('button', name=re.compile('更多操作')).click()
    row.get_by_role('menuitem', name='编辑', exact=True).click()
    expect(page.get_by_role('dialog', name='编辑任务')).to_be_visible()
    box = page.get_by_role('dialog').bounding_box()
    assert box['x'] >= 0 and box['y'] >= 0
    assert box['x'] + box['width'] <= page.viewport_size['width']
    assert box['y'] + box['height'] <= page.viewport_size['height']
    page.keyboard.press('Escape')
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('combobox', name='界面语言')).to_have_value('zh-CN')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for name, width, height in [('desktop', 1440, 1000), ('mobile-375', 375, 812),
                                ('mobile-390', 390, 844), ('landscape', 812, 375)]:
        context = browser.new_context(viewport={'width': width, 'height': height},
                                      locale='en-US', timezone_id='Asia/Singapore', reduced_motion='reduce')
        page = context.new_page()
        page.set_default_timeout(5000)
        page.set_default_navigation_timeout(30000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.clock.install(time=datetime(2026, 10, 28, 4, tzinfo=timezone.utc))
        try:
            page.goto(args.url, wait_until='networkidle')
            open_settings(page)
            expect(page.get_by_text('FocusFlow 版本 ' + args.expected_version, exact=True)).to_be_visible()
            page.keyboard.press('Escape')
            language_workflow(page, name)
            results.append({'case': name, 'result': 'PASS', 'languages': ['zh-CN', 'en']})
            print('PASS ' + name, flush=True)
        except Exception as error:
            results.append({'case': name, 'result': 'FAIL', 'detail': str(error)})
            print('FAIL ' + name + ': ' + str(error), flush=True)
        finally:
            context.close()
    browser.close()

Path(args.output).write_text(json.dumps({
    'url': args.url, 'expected_version': args.expected_version,
    'browser': 'isolated Microsoft Edge', 'browser_locale': 'en-US',
    'clock': 'Timers advanced by script-set timestamps; fixed sample tasks and an English browser locale',
    'results': results, 'unexpected_errors': errors,
}, ensure_ascii=False, indent=2), encoding='utf-8')
raise SystemExit(1 if errors or any(item['result'] != 'PASS' for item in results) else 0)
