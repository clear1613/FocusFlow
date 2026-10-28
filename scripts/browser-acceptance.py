"""Browser acceptance for FocusFlow. Requires Python Playwright and an installed Edge.

Run against an already started dev/preview server:
  python scripts/browser-acceptance.py --url http://127.0.0.1:5173
Each case gets its own browser context and a fixed set of sample tasks; no personal profile is used.
"""
import argparse
import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--output', default='docs/acceptance/local-dev.json')
parser.add_argument('--case', help='Run a single acceptance case while debugging')
parser.add_argument('--production', action='store_true', help='Run against the live site and keep the result in docs/acceptance/production.json')
parser.add_argument('--expected-version', help='Reject a stale deployment before running a case')
parser.add_argument('--screenshots-dir', help='Keep screenshots for a new acceptance run separate')
args = parser.parse_args()
shots = Path(args.screenshots_dir or ('docs/screenshots/production/business' if args.production else 'docs/screenshots/local/business'))
shots.mkdir(parents=True, exist_ok=True)
results, messages = [], []
versions = set()
NOW = datetime(2026, 10, 24, 4, 0, tzinfo=timezone.utc)


def read(page):
    return page.evaluate("JSON.parse(localStorage.getItem('focusflow:data'))")


def seed(page, data):
    raw = data if isinstance(data, str) else json.dumps(data)
    page.evaluate("raw => localStorage.setItem('focusflow:data', raw)", raw)
    page.reload(wait_until='networkidle')
    select_english(page)


def select_english(page):
    # Business regression scenarios explicitly run in English. Default Chinese
    # and live switching are covered by locale-browser-acceptance.py.
    page.locator('header select').select_option('en')


def create_task(page, title='Release acceptance'):
    page.locator('#new-task-title').fill(title)
    page.get_by_role('button', name='Add', exact=True).click()
    return page.locator('article').filter(has_text=title)


def stat(page, label):
    return int(page.get_by_role('region', name='Today', exact=True).get_by_text(label, exact=True).locator('..').inner_text().split()[0])


def task_timer(page):
    row = create_task(page)
    row.get_by_role('button', name='Release acceptance').click()
    page.get_by_role('button', name='Start', exact=True).click()
    data = read(page)
    assert data['timer']['status'] == 'running'
    assert len(data['sessions']) == 1
    sid = data['timer']['activeSessionId']
    assert data['sessions'][0]['id'] == sid and data['sessions'][0]['status'] == 'running'
    assert data['timer']['startedAt'] and data['timer']['endAt']
    page.clock.fast_forward(10_000)
    page.get_by_role('button', name='Pause', exact=True).click()
    paused = read(page)
    page.clock.fast_forward(30_000)
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('button', name='Resume')).to_be_visible()
    assert read(page)['timer']['remainingSeconds'] == paused['timer']['remainingSeconds']
    page.get_by_role('button', name='Resume').click()
    assert read(page)['timer']['activeSessionId'] == sid
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('button', name='Pause')).to_be_visible()
    assert len(read(page)['sessions']) == 1
    page.clock.fast_forward(paused['timer']['remainingSeconds'] * 1000)
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    data = read(page)
    assert len(data['sessions']) == 1 and data['sessions'][0]['status'] == 'completed'
    assert data['sessions'][0]['actualDurationSeconds'] == 1500
    assert data['tasks'][0]['completedPomodoros'] == 1
    assert data['timer']['mode'] == 'short_break' and data['timer']['completedFocusCountInCycle'] == 1
    expect(page.get_by_text('Focus complete', exact=True)).to_be_visible()
    assert stat(page, 'Pomodoros') == 1 and stat(page, 'Focus min') == 25
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(300_000)
    expect(page.get_by_text('Break complete', exact=True)).to_be_visible()
    assert read(page)['timer']['mode'] == 'focus'
    assert stat(page, 'Pomodoros') == 1
    row.get_by_role('button', name='Done', exact=True).click()
    assert stat(page, 'Tasks') == 1
    expect(page.get_by_text('Release acceptance', exact=True)).to_have_count(0)
    page.get_by_role('button', name='Completed').click()
    row = page.locator('article').filter(has_text='Release acceptance')
    expect(row.get_by_role('button', name='Release acceptance')).to_be_disabled()
    row.get_by_role('button', name='Edit', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_label('Task name').fill('Reviewed acceptance')
    dialog.get_by_role('button', name='Save').click()
    row = page.locator('article').filter(has_text='Reviewed acceptance')
    row.get_by_role('button', name='Delete', exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('Deleted Task')
    page.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    assert len(read(page)['sessions']) == 2
    assert stat(page, 'Focus min') == 25 and stat(page, 'Day streak') == 1
    # There is no History UI in V1; validate the existing label resolver.
    if ':5173' in args.url:
        assert page.evaluate("async () => { const m = await import('/src/services/taskService.ts'); return m.resolveTaskLabel([], 'deleted'); }") == 'Deleted Task'
    row = create_task(page, 'No history')
    row.get_by_role('button', name='Delete', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.get_by_text('No history', exact=True)).to_have_count(0)


def reset_skip_cycle(page):
    for paused in (False, True):
        page.get_by_role('button', name='Start', exact=True).click()
        page.clock.fast_forward(2_000)
        if paused:
            page.get_by_role('button', name='Pause').click()
        page.get_by_role('region', name='Pomodoro timer').get_by_role('button', name='Reset', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Reset', exact=True).click()
        assert read(page)['sessions'][-1]['status'] == 'cancelled'
    page.get_by_role('button', name='Start', exact=True).click()
    page.get_by_role('button', name='Skip', exact=True).click()
    assert read(page)['sessions'][-1]['status'] == 'skipped'
    assert stat(page, 'Focus min') == 0 and stat(page, 'Day streak') == 0
    assert read(page)['timer']['completedFocusCountInCycle'] == 0
    page.get_by_role('button', name='Skip', exact=True).click()
    for cycle in range(1, 5):
        page.get_by_role('button', name='Start', exact=True).click()
        page.clock.fast_forward(1_500_000)
        data = read(page)
        assert data['timer']['mode'] == ('long_break' if cycle == 4 else 'short_break')
        assert data['timer']['completedFocusCountInCycle'] == cycle % 4
        if cycle < 4:
            page.get_by_role('button', name='Skip', exact=True).click()
    page.reload(wait_until='networkidle')
    assert stat(page, 'Pomodoros') == 4


def persistence(page):
    page.get_by_role('spinbutton', name='Focus', exact=True).fill('5')
    baseline = read(page)
    page.get_by_role('combobox', name='Theme', exact=True).select_option('dark')
    page.reload(wait_until='networkidle')
    assert read(page)['settings']['theme'] == 'dark'
    seed(page, '{invalid-json')
    expect(page.get_by_text('本地数据恢复', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Start', exact=True)).to_be_visible()
    invalid_cases = []
    for mutate in ('task-status', 'timer-status', 'negative-duration', 'missing-field'):
        data = copy.deepcopy(baseline)
        if mutate == 'task-status':
            data['tasks'] = [{'id': 'invalid', 'title': 'Invalid', 'estimatedPomodoros': 1,
                              'completedPomodoros': 0, 'status': 'invalid', 'createdAt': 1, 'completedAt': None}]
        elif mutate == 'timer-status':
            data['timer']['status'] = 'invalid'
        elif mutate == 'negative-duration':
            data['timer']['plannedDurationSeconds'] = -1
        else:
            del data['settings']['focusMinutes']
        seed(page, data)
        expect(page.get_by_text('本地数据恢复', exact=True)).to_be_visible()
        assert read(page)['settings']['focusMinutes'] == 25
        invalid_cases.append(mutate)
    legacy = copy.deepcopy(baseline)
    legacy['version'] = 0
    del legacy['timer']['plannedDurationSeconds']
    del legacy['timer']['completedFocusCountInCycle']
    del legacy['settings']['theme']
    seed(page, legacy)
    assert read(page)['version'] == 2 and read(page)['settings']['theme'] == 'system'
    expect(page.get_by_text('Storage migrated', exact=True)).to_be_visible()
    seed(page, {'version': 999})
    expect(page.get_by_role('alert')).to_be_visible()
    create_task(page, 'Write protection probe')
    assert read(page) == {'version': 999}
    page.get_by_role('region', name='Settings').get_by_role('button', name='Reset', exact=True).click()
    page.get_by_role('dialog').get_by_role('button', name='Reset all data', exact=True).click()
    expect(page.get_by_text('本地数据已重置', exact=True)).to_be_visible()
    select_english(page)
    expect(page.get_by_role('alert')).to_have_count(0)
    create_task(page, 'Writes unlocked')
    assert read(page)['version'] == 2 and len(read(page)['tasks']) == 1


def expired_analytics(page):
    create_task(page)
    page.locator('article').get_by_role('button', name='Release acceptance').click()
    page.get_by_role('button', name='Start', exact=True).click()
    running = read(page)
    page.goto('about:blank')
    page.clock.fast_forward(1_600_000)
    page.goto(args.url, wait_until='networkidle')
    restored = read(page)
    assert restored['sessions'][0]['completedAt'] == running['timer']['endAt']
    expect(page.get_by_text('Focus complete', exact=True)).to_be_visible()
    page.reload(wait_until='networkidle')
    assert len(read(page)['sessions']) == 1 and read(page)['tasks'][0]['completedPomodoros'] == 1
    page.get_by_role('button', name='Skip', exact=True).click()
    page.get_by_role('spinbutton', name='Focus', exact=True).fill('50')
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(3_000_000)
    assert stat(page, 'Focus min') == 75
    assert stat(page, 'Pomodoros') == 2
    week = page.get_by_role('list', name='Last 7 days focus minutes').inner_text()
    assert '75 minutes' in week
    row = page.locator('article')
    row.get_by_role('button', name='Delete', exact=True).click()
    page.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    assert stat(page, 'Focus min') == 75 and stat(page, 'Day streak') == 1
    assert page.get_by_role('list', name='Last 7 days focus minutes').inner_text() == week
    # Cross-midnight deadline, restored the next morning.
    data = copy.deepcopy(restored)
    deadline = int(datetime(2026, 10, 24, 15, 59, tzinfo=timezone.utc).timestamp() * 1000)
    data['sessions'][0].update(status='running', completedAt=None, endedAt=None, startedAt=deadline - 1_500_000)
    data['timer'].update(mode='focus', status='running', startedAt=deadline - 1_500_000,
                         activeSessionId=data['sessions'][0]['id'], endAt=deadline)
    data['tasks'][0]['completedPomodoros'] = 0
    page.clock.set_system_time(datetime(2026, 10, 25, 0, tzinfo=timezone.utc))
    seed(page, data)
    assert read(page)['sessions'][0]['completedAt'] == deadline
    assert stat(page, 'Pomodoros') == 0
    assert stat(page, 'Day streak') == 1


def theme_modal_mobile(page):
    page.get_by_role('combobox', name='Theme', exact=True).select_option('dark')
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.get_by_role('combobox', name='Theme', exact=True).select_option('light')
    assert page.locator('html').get_attribute('data-theme') == 'light'
    page.get_by_role('combobox', name='Theme', exact=True).select_option('system')
    page.emulate_media(color_scheme='dark')
    expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
    page.emulate_media(color_scheme='light')
    expect(page.locator('html')).to_have_attribute('data-theme', 'light')
    row = create_task(page, 'A' * 80)
    page.get_by_role('button', name='Start', exact=True).click()
    edit = row.get_by_role('button', name='Edit', exact=True)
    edit.click()
    dialog = page.get_by_role('dialog')
    title = dialog.get_by_label('Task name')
    expect(title).to_be_focused()
    page.clock.fast_forward(3_000)
    expect(title).to_be_focused()
    save = dialog.get_by_role('button', name='Save', exact=True)
    save.focus()
    page.keyboard.press('Tab')
    expect(dialog.get_by_role('button', name='Close dialog')).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(save).to_be_focused()
    page.keyboard.press('Escape')
    expect(edit).to_be_focused()
    edit.click()
    page.get_by_role('presentation').click(position={'x': 2, 'y': 2})
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(edit).to_be_focused()
    page.get_by_role('button', name='Pause', exact=True).click()
    for width, height in ((375, 812), (390, 844)):
        page.set_viewport_size({'width': width, 'height': height})
        page.get_by_role('combobox', name='Theme', exact=True).select_option('dark' if width == 390 else 'light')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > innerWidth).map(e => ({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,10)})")
        assert page.get_by_role('region', name='Pomodoro timer').evaluate('(e) => e.scrollWidth <= e.clientWidth')
        edit.click()
        box = page.get_by_role('dialog').bounding_box()
        assert box['x'] >= 0 and box['y'] >= 0
        assert box['x'] + box['width'] <= width and box['y'] + box['height'] <= height
        page.screenshot(path=str(shots / f'mobile-{width}-dialog.png'), full_page=True)
        page.keyboard.press('Escape')
        page.screenshot(path=str(shots / f'mobile-{width}.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.get_by_role('combobox', name='Theme', exact=True).select_option('light')
    page.screenshot(path=str(shots / 'timer-desktop.png'), full_page=True)


def notification(page):
    assert page.evaluate('window.__requests') == 0
    control = page.get_by_role('checkbox', name='Desktop notification')
    control.check()
    assert page.evaluate('window.__requests') == 1
    expect(page.get_by_text('Desktop notifications enabled', exact=True)).to_be_visible()
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(1_500_000)
    assert page.evaluate('window.__sent') == 1
    assert stat(page, 'Pomodoros') == 1
    page.evaluate('window.__throwNotification = true')
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(300_000)
    expect(page.get_by_text('Break complete', exact=True)).to_be_visible()
    assert read(page)['timer']['mode'] == 'focus'


NOTIFICATIONS = """() => {
  window.__requests = 0; window.__sent = 0; window.__throwNotification = false;
  window.Notification = class {
    static permission = 'default';
    static async requestPermission() { window.__requests++; this.permission = 'granted'; return 'granted'; }
    constructor() { if (window.__throwNotification) throw new Error('Injected notification failure'); window.__sent++; }
  };
}"""


def denied_notification(page):
    page.get_by_role('checkbox', name='Desktop notification').click()
    page.get_by_role('checkbox', name='Desktop notification').click()
    assert page.evaluate('window.__requests') == 0
    expect(page.get_by_text('Notification permission is blocked', exact=True)).to_have_count(2)
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(1_500_000)
    assert stat(page, 'Pomodoros') == 1


def unsupported_notification(page):
    expect(page.get_by_role('checkbox', name='Desktop notification')).to_be_disabled()
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(1_500_000)
    expect(page.get_by_text('Focus complete', exact=True)).to_be_visible()


def permission_failure(page):
    page.get_by_role('checkbox', name='Desktop notification').click()
    expect(page.get_by_text('Notification permission request failed', exact=True)).to_be_visible()
    assert not read(page)['settings']['notificationEnabled']


def native_notification_granted(page):
    assert page.evaluate('Notification.permission') == 'granted'
    page.get_by_role('checkbox', name='Desktop notification').click()
    expect(page.get_by_text('Desktop notifications enabled', exact=True)).to_be_visible()
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(1_500_000)
    assert page.evaluate('window.__nativeSent') == 1
    assert stat(page, 'Pomodoros') == 1


def capture_readme(page):
    row = create_task(page, 'Review release checklist')
    row.get_by_role('button', name='Review release checklist').click()
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(1_500_000)
    row.get_by_role('button', name='Done', exact=True).click()
    page.get_by_role('button', name='Skip', exact=True).click()
    row = create_task(page, 'Prepare documentation')
    row.get_by_role('button', name='Prepare documentation').click()
    page.get_by_role('button', name='Start', exact=True).click()
    page.clock.fast_forward(180_000)
    page.get_by_role('button', name='Pause', exact=True).click()
    assert stat(page, 'Focus min') == 25
    page.screenshot(path=str(shots / 'home-desktop.png'), full_page=True)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    browser_version = browser.version
    cases = [(task_timer, None), (reset_skip_cycle, None), (persistence, None),
             (expired_analytics, None), (theme_modal_mobile, None),
             (notification, NOTIFICATIONS),
             (denied_notification, NOTIFICATIONS.replace("static permission = 'default'", "static permission = 'denied'")),
             (unsupported_notification, '() => { delete window.Notification; }'),
             (permission_failure, NOTIFICATIONS.replace("window.__requests++; this.permission = 'granted'; return 'granted';", "throw new Error('Injected permission failure');")),
             (native_notification_granted, "() => { window.__nativeSent = 0; const Native = window.Notification; window.Notification = class extends Native { constructor(...args) { super(...args); window.__nativeSent++; this.close(); } }; }"),
             (capture_readme, None)]
    for case, init in cases:
        if args.case and case.__name__ != args.case:
            continue
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, timezone_id='Asia/Singapore')
        if case.__name__ == 'native_notification_granted':
            context.grant_permissions(['notifications'], origin=args.url)
        if init:
            context.add_init_script(f'({init})()')
        page = context.new_page()
        page.set_default_timeout(5000)
        # Public-host navigation can exceed the local UI interaction budget.
        page.set_default_navigation_timeout(30_000)
        page.on('pageerror', lambda error: messages.append({'type': 'pageerror', 'text': str(error)}))
        page.on('console', lambda message: messages.append({'type': message.type, 'text': message.text}) if message.type in ('error', 'warning') else None)
        page.clock.install(time=NOW)
        try:
            page.goto(args.url, wait_until='networkidle')
            select_english(page)
            version_label = page.locator('[aria-label^="FocusFlow version "]').get_attribute('aria-label')
            version = version_label[len('FocusFlow version '):]
            versions.add(version)
            if args.expected_version and version != args.expected_version:
                raise AssertionError(f'Expected deployed version {args.expected_version}, received {version}')
            case(page)
            results.append({'case': case.__name__, 'result': 'PASS'})
            print(f'PASS {case.__name__}', flush=True)
        except Exception as error:
            import traceback
            print(traceback.format_exc(), flush=True)
            results.append({'case': case.__name__, 'result': 'FAIL', 'detail': str(error)})
            print(f'FAIL {case.__name__}: {error}', flush=True)
        finally:
            context.close()
    browser.close()

unexpected = [m for m in messages if m['type'] in ('pageerror', 'error') and
              'write-protected because stored data' not in m['text']]
report = {'browser': f'Edge {browser_version}', 'url': args.url, 'timezone': 'Asia/Singapore',
          'environment': 'production' if args.production else 'local',
          'application_versions': sorted(versions),
          'clock': 'Timers advanced by script-set timestamps; fixed sample tasks in isolated contexts',
          'results': results, 'console': messages, 'unexpected_errors': unexpected}
Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
if not results:
    raise SystemExit('No acceptance cases selected')
raise SystemExit(1 if unexpected or any(r['result'] != 'PASS' for r in results) else 0)
