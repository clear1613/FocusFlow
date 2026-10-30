"""Shared-browser tabs, ownership transfer and real built-chunk failures in Edge."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from acceptance_navigation import navigate

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4173/FocusFlow/')
parser.add_argument('--expected-version', default=json.loads(Path('package.json').read_text(encoding='utf-8'))['version'])
parser.add_argument('--output', default='.artifacts/acceptance/local/coordination.json')
parser.add_argument('--screenshots-dir', default='.artifacts/screenshots/local/coordination')
cases = ['desktop-zh', 'mobile-375-zh', 'mobile-390-en-dark', 'landscape-en', 'reload-and-return', 'unsupported-lock', 'history-chunk-failure', 'chart-chunk-failure']
parser.add_argument('--case', choices=cases)
args = parser.parse_args()
shots = Path(args.screenshots_dir)
shots.mkdir(parents=True, exist_ok=True)
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
results, errors, retries, expected_errors = [], [], [], []
NOW = datetime(2026, 10, 30, 4, 0, tzinfo=timezone.utc)


def state(page):
    return page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")


def open_page(context, messages):
    page = context.new_page()
    page.set_default_timeout(8000)
    page.set_default_navigation_timeout(30000)
    if len(context.pages) == 1:
        page.clock.install(time=NOW)
    page.on('pageerror', lambda error: messages.append(str(error)))
    page.on('console', lambda message: messages.append(message.text) if message.type in ('error', 'warning') else None)
    return page


def configure(page, en=False, dark=False):
    if en:
        page.locator('header select').select_option('en')
    page.get_by_role('button', name='Open settings' if en else '打开设置', exact=True).click()
    dialog = page.get_by_role('dialog', name='Settings' if en else '设置', exact=True)
    expect(dialog.get_by_text(('FocusFlow version ' if en else 'FocusFlow 版本 ') + args.expected_version, exact=True)).to_be_visible()
    dialog.get_by_role('spinbutton', name='Focus' if en else '专注', exact=True).fill('1')
    sound = dialog.get_by_role('switch', name='Sound' if en else '声音提醒', exact=True)
    if sound.is_checked():
        dialog.locator('label').filter(has_text='Sound' if en else '声音提醒').click()
    if dark:
        dialog.get_by_role('combobox', name='Theme' if en else '主题', exact=True).select_option('dark')
    page.keyboard.press('Escape')


def add_task(page, title, en=False):
    page.locator('#new-task-title').fill(title)
    page.get_by_role('button', name='Add' if en else '添加', exact=True).click()
    return page.locator('article').filter(has_text=title)


def overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'


def workflow(context, name, messages):
    en = 'en' in name
    first = open_page(context, messages)
    requests = []
    first.on('request', lambda request: requests.append(request.url))
    navigate(first, args.url, retries)
    expect(first.locator('#new-task-title')).to_be_visible()
    assert not any('/HistoryView-' in url or '/SettingsPanel-' in url for url in requests), 'Optional views loaded before use'
    configure(first, en, 'dark' in name)
    row = add_task(first, '同一任务 · shared task', en)
    row.get_by_role('button').nth(1).click()
    first.get_by_role('button', name='Start focus' if en else '开始专注', exact=True).click()
    original = state(first)
    session_id = original['timer']['activeSessionId']
    reader = open_page(context, messages)
    reader.add_init_script("""window.__writes = 0; const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if(key === 'focusflow:data') window.__writes++; return set.call(this, key, value); };""")
    navigate(reader, args.url, retries)
    expect(reader.get_by_role('heading', name='This window is following your active window' if en else '此窗口正在同步查看', exact=True)).to_be_visible()
    assert reader.get_by_role('textbox').count() == 0
    expect(reader.get_by_text('同一任务 · shared task', exact=True)).to_be_visible()
    assert reader.evaluate('window.__writes') == 0
    add_task(first, '必须保留的新任务', en)
    # Settings change and reader rehydration must keep the same active Session.
    first.get_by_role('button', name='Pause' if en else '暂停一下', exact=True).click()
    paused_seconds = state(first)['timer']['remainingSeconds']
    expect(reader.get_by_text(f'{paused_seconds // 60:02}:{paused_seconds % 60:02}', exact=True)).to_be_visible()
    first.get_by_role('button', name='Resume focus' if en else '继续专注', exact=True).click()
    expected_end = state(first)['timer']['endAt']
    # Playwright's page clocks share a BrowserContext. Shift Date.now only in
    # the reader so its expiry cannot advance the writer's timer as well.
    reader.evaluate('const previousNow = Date.now.bind(Date); Date.now = () => previousNow() + 125000')
    expect(reader.get_by_text('00:00', exact=True)).to_be_visible()
    assert state(first)['sessions'][0]['status'] == 'running', 'Reader completed a Session'
    assert reader.evaluate('window.__writes') == 0
    overflow(reader)
    reader.screenshot(path=str(shots / (name + '-reader.png')), full_page=True)
    first.close()
    expect(reader.locator('#new-task-title')).to_be_visible()
    saved = state(reader)
    assert saved['sessions'][0]['id'] == session_id
    assert saved['sessions'][0]['status'] == 'completed'
    assert saved['sessions'][0]['completedAt'] == expected_end
    assert len(saved['sessions']) == 1
    assert saved['tasks'][0]['completedPomodoros'] == 1
    assert any(task['title'] == '必须保留的新任务' for task in saved['tasks'])
    reader.reload(wait_until='networkidle')
    expect(reader.locator('#new-task-title')).to_be_visible()
    assert state(reader)['tasks'][0]['completedPomodoros'] == 1
    assert len(state(reader)['sessions']) == 1
    overflow(reader)
    reader.screenshot(path=str(shots / (name + '-writer.png')), full_page=True)


def lifecycle(context, messages):
    first = open_page(context, messages)
    navigate(first, args.url, retries)
    add_task(first, '刷新与返回保留')
    second = open_page(context, messages)
    navigate(second, args.url, retries)
    expect(second.get_by_role('heading', name='此窗口正在同步查看')).to_be_visible()
    first.reload(wait_until='networkidle')
    expect(second.locator('#new-task-title')).to_be_visible()
    expect(first.get_by_role('heading', name='此窗口正在同步查看')).to_be_visible()
    add_task(second, '接管后新增')
    second.goto('about:blank')
    expect(first.locator('#new-task-title')).to_be_visible()
    second.go_back(wait_until='networkidle')
    expect(second.get_by_role('heading', name='此窗口正在同步查看')).to_be_visible()
    assert len(state(first)['tasks']) == 2
    # Reset is a removeItem event, so the reader must discard its old tasks.
    configure(first)
    first.get_by_role('button', name='打开设置', exact=True).click()
    first.get_by_role('dialog', name='设置', exact=True).get_by_role('button', name='重置', exact=True).click()
    confirm = first.get_by_role('dialog').last
    confirm.get_by_role('button', name='清空所有数据', exact=True).click()
    expect(second.get_by_text('尚未选择任务', exact=True)).to_be_visible()
    assert first.evaluate("localStorage.getItem('focusflow:data')") is None


def unsupported(context, messages):
    context.add_init_script("Object.defineProperty(navigator, 'locks', { value: undefined });")
    page = open_page(context, messages)
    navigate(page, args.url, retries)
    expect(page.get_by_role('heading', name='当前浏览器处于只读模式')).to_be_visible()
    assert page.get_by_role('textbox').count() == 0
    assert page.evaluate("localStorage.getItem('focusflow:data')") is None
    overflow(page)
    page.screenshot(path=str(shots / 'unsupported-lock.png'), full_page=True)


def broken_chunk(context, name, messages):
    part = 'HistoryView' if name.startswith('history') else 'WeeklyChart'
    context.route('**/assets/' + part + '-*.js', lambda route: route.abort())
    page = open_page(context, messages)
    navigate(page, args.url, retries)
    expect(page.locator('#new-task-title')).to_be_visible()
    configure(page)
    add_task(page, '模块失败时仍可使用')
    page.get_by_role('button', name='开始专注', exact=True).click()
    if part == 'HistoryView':
        page.get_by_role('button', name='查看专注历史', exact=True).click()
    expect(page.get_by_role('alert').filter(has_text='此区域加载失败，计时仍在继续。')).to_be_visible()
    page.clock.fast_forward(61000)
    assert len(state(page)['sessions']) == 1
    assert state(page)['sessions'][0]['status'] == 'completed'
    if part == 'HistoryView':
        page.get_by_role('button', name='返回专注', exact=True).click()
    expect(page.get_by_role('button', name='开始休息', exact=True)).to_be_visible()
    overflow(page)
    page.screenshot(path=str(shots / (name + '.png')), full_page=True)


with sync_playwright() as p:
    for name in cases:
        if args.case and name != args.case:
            continue
        browser = p.chromium.launch(channel='msedge', headless=True)
        width, height = (375, 812) if name == 'mobile-375-zh' else (390, 844) if name == 'mobile-390-en-dark' else (812, 375) if name == 'landscape-en' else (1440, 1000)
        context = browser.new_context(viewport={'width': width, 'height': height}, timezone_id='Asia/Singapore', locale='en-US')
        messages = []
        try:
            if name == 'unsupported-lock': unsupported(context, messages)
            elif name.endswith('chunk-failure'): broken_chunk(context, name, messages)
            elif name == 'reload-and-return': lifecycle(context, messages)
            else: workflow(context, name, messages)
            results.append({'case': name, 'result': 'PASS'})
            print('PASS ' + name, flush=True)
        except Exception as error:
            import traceback
            traceback.print_exc()
            results.append({'case': name, 'result': 'FAIL', 'detail': str(error)})
            print('FAIL ' + name + ': ' + str(error), flush=True)
        finally:
            for message in messages:
                target = expected_errors if name.endswith('chunk-failure') and any(fragment in message for fragment in ['Failed to fetch dynamically imported module', 'ERR_FAILED', 'Failed to load resource']) else errors
                target.append({'case': name, 'message': message})
            context.close()
            browser.close()

Path(args.output).write_text(json.dumps({'url': args.url, 'expected_version': args.expected_version,
    'clock': 'Script-controlled page clocks; isolated Edge processes; tabs share one real browser context and LocalStorage; built chunks aborted only in named failure cases',
    'results': results, 'unexpected_errors': errors, 'expected_chunk_errors': expected_errors, 'navigation_retries': retries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
raise SystemExit(1 if errors or any(item['result'] != 'PASS' for item in results) else 0)
