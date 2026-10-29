"""History, real CSV downloads and an active timer in isolated Edge processes."""
import argparse
import copy
import csv
import io
import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from acceptance_navigation import navigate

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--expected-version', default='1.3.0')
parser.add_argument('--output', default='docs/acceptance/history-local.json')
parser.add_argument('--screenshots-dir', default='docs/screenshots/history/local')
parser.add_argument('--case', choices=['desktop-zh', 'mobile-375-zh', 'mobile-390-en-dark', 'landscape-en'])
args = parser.parse_args()
shots = Path(args.screenshots_dir)
shots.mkdir(parents=True, exist_ok=True)
results, errors, retries = [], [], []
NOW = datetime(2026, 10, 29, 4, tzinfo=timezone.utc)
TITLE = '论文, "第一章"\n修改 🍅'
LONG_TITLE = '=SUM(1,2) ' + '超长任务名' * 14


def stamp(value):
    return int(datetime.fromisoformat(value + '+08:00').timestamp() * 1000)


def fixture(data, language, theme, current):
    data = copy.deepcopy(data)
    data['settings'].update(locale=language, theme=theme, focusMinutes=1, soundEnabled=False, notificationEnabled=False, autoStartBreak=False, autoStartFocus=False)
    def session(identity, end, duration=60, task='a', status='completed', mode='focus'):
        return {'id': identity, 'taskId': task, 'type': mode, 'status': status, 'startedAt': end-duration*1000,
                'endedAt': end, 'completedAt': end if status == 'completed' else None,
                'actualDurationSeconds': duration, 'plannedDurationSeconds': max(60, duration)}
    data['tasks'] = [{'id': 'a', 'title': TITLE, 'estimatedPomodoros': 99, 'completedPomodoros': 23, 'status': 'todo', 'createdAt': stamp('2026-10-01T00:00:00'), 'completedAt': None},
                     {'id': 'b', 'title': LONG_TITLE, 'estimatedPomodoros': 2, 'completedPomodoros': 1, 'status': 'todo', 'createdAt': stamp('2026-10-01T00:00:00'), 'completedAt': None}]
    data['sessions'] = [session('history-'+str(i), stamp('2026-10-29T10:00:00')-i*60000) for i in range(23)]
    data['sessions'] += [session('midnight', stamp('2026-10-29T00:15:00'), 1500, 'b'),
                         session('cancel', stamp('2026-10-29T08:00:00'), 120, status='cancelled'),
                         session('skip', stamp('2026-10-29T08:30:00'), 30, status='skipped'),
                         session('deleted', stamp('2026-10-28T09:00:00'), 300, 'gone'),
                         session('unassigned', stamp('2026-10-25T09:00:00'), 600, None),
                         session('old', stamp('2026-10-01T09:00:00'), 1800),
                         session('break', stamp('2026-10-29T09:00:00'), 300, mode='short_break'),
                         {'id': 'active', 'taskId': 'a', 'type': 'focus', 'status': 'running', 'startedAt': current, 'endedAt': None, 'completedAt': None, 'actualDurationSeconds': 0, 'plannedDurationSeconds': 60}]
    data['activeTaskId'] = 'a'
    data['timer'].update(mode='focus', status='running', startedAt=current, endAt=current+60000, remainingSeconds=60, plannedDurationSeconds=60, activeSessionId='active', completedFocusCountInCycle=0)
    return data


def exercise(page, language, theme, name, temporary):
    zh = language == 'zh-CN'
    def button(text): return page.get_by_role('button', name=text, exact=True)
    def raw(): return page.evaluate("localStorage.getItem('focusflow:data')")
    def setting(): button('打开设置' if zh else 'Open settings').click()
    def select(label, value): page.get_by_role('combobox', name=label, exact=True).select_option(value)
    def count(value): expect(page.get_by_text(str(value)+' 条记录' if zh else str(value)+' records', exact=True)).to_be_visible()
    def summary(count, minutes): expect(page.get_by_text(f'{count} 次完成 · 专注 {minutes} 分钟' if zh else f'{count} completed · {minutes} focus minutes', exact=True)).to_be_visible()
    labels = {'open': '查看专注历史' if zh else 'View focus history', 'back': '返回专注' if zh else 'Back to focus',
              'range': '日期范围' if zh else 'Date range', 'task': '任务筛选' if zh else 'Task filter', 'status': '状态筛选' if zh else 'Status filter',
              'csv': '导出 CSV' if zh else 'Export CSV', 'next': '下一页' if zh else 'Next page'}
    # An actual language change persists the default V2 envelope before seeding.
    page.locator('header select').select_option('en')
    page.locator('header select').select_option(language)
    setting()
    expect(page.get_by_text(('FocusFlow 版本 ' if zh else 'FocusFlow version ') + args.expected_version, exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    page.clock.pause_at(datetime.fromtimestamp(page.evaluate('Date.now()') / 1000, timezone.utc) + timedelta(seconds=1))
    data = fixture(json.loads(raw()), language, theme, page.evaluate('Date.now()'))
    page.evaluate("data => localStorage.setItem('focusflow:data', JSON.stringify(data))", data)
    page.reload(wait_until='networkidle')
    expect(button('暂停一下' if zh else 'Pause')).to_be_visible()
    page.get_by_role('textbox', name='任务名称' if zh else 'Task name', exact=True).fill('留在工作台的草稿')
    original = raw()
    button(labels['open']).click()
    expect(page.get_by_role('heading', name='专注历史' if zh else 'Focus history', exact=True)).to_be_focused()
    expect(page.get_by_role('article')).to_have_count(20)
    count(28)
    summary(26, 63)
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(shots / (name+'-history.png')))
    button(labels['next']).click()
    expect(page.get_by_role('article')).to_have_count(8)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    with page.expect_download() as waiting:
        button(labels['csv']).click()
    download = waiting.value
    assert download.suggested_filename == 'focusflow-history-2026-10-23-2026-10-29.csv'
    saved = Path(temporary) / (name + '.csv')
    download.save_as(saved)
    content = saved.read_bytes()
    assert content.startswith(b'\xef\xbb\xbf')
    rows = list(csv.reader(io.StringIO(content.decode('utf-8-sig'), newline='')))
    assert len(rows) == 29 and all(len(row) == 7 for row in rows)
    assert rows[1][1] == TITLE
    assert any(row[1] == "'" + LONG_TITLE for row in rows[1:])
    assert rows[1][2].endswith('+08:00')
    assert any(row[-2] == '1500' for row in rows[1:])
    assert any(row[1] == ('已删除任务' if zh else 'Deleted task') for row in rows[1:])
    assert raw() == original, 'History browsing/export changed persisted data'
    select(labels['task'], 'task:a')
    select(labels['status'], 'cancelled')
    count(1)
    summary(0, 0)
    select(labels['status'], 'all')
    select(labels['task'], 'deleted')
    count(1)
    select(labels['task'], 'unassigned')
    count(1)
    select(labels['task'], 'all')
    select(labels['range'], '30d')
    count(29)
    summary(27, 93)
    select(labels['range'], 'custom')
    page.get_by_label('开始日期' if zh else 'Start date', exact=True).fill('2026-10-30')
    expect(page.get_by_role('alert')).to_be_visible()
    expect(button(labels['csv'])).to_be_disabled()
    page.get_by_label('开始日期' if zh else 'Start date', exact=True).fill('2026-10-28')
    count(27)
    summary(25, 53)
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(shots / (name+'-custom.png')))
    select(labels['range'], 'today')
    select(labels['task'], 'task:a')
    select(labels['status'], 'completed')
    summary(23, 23)
    other = 'en' if zh else 'zh-CN'
    page.locator('header select').select_option(other)
    expect(page.get_by_role('combobox', name='Status filter' if zh else '状态筛选', exact=True)).to_have_value('completed')
    expect(page.get_by_role('combobox', name='Task filter' if zh else '任务筛选', exact=True)).to_have_value('task:a')
    page.locator('header select').select_option(language)
    button(labels['back']).click()
    expect(page.get_by_role('textbox', name='任务名称' if zh else 'Task name', exact=True)).to_have_value('留在工作台的草稿')
    button(labels['open']).click()
    page.clock.fast_forward(61000)
    restored = json.loads(raw())
    assert len(restored['sessions']) == len(data['sessions'])
    assert next(row for row in restored['sessions'] if row['id'] == 'active')['status'] == 'completed'
    assert restored['tasks'][0]['completedPomodoros'] == 24
    count(29)
    summary(27, 64)
    page.clock.fast_forward(5000)
    assert json.loads(raw())['tasks'][0]['completedPomodoros'] == 24
    setting()
    with page.expect_download() as waiting:
        button('导出备份' if zh else 'Export backup').click()
    saved_backup = Path(temporary) / (name + '-backup.json')
    waiting.value.save_as(saved_backup)
    backup = saved_backup.read_bytes()
    assert json.loads(backup)['data']['version'] == 2
    assert json.loads(backup)['appVersion'] == args.expected_version
    button('重置' if zh else 'Reset').click()
    dialog = page.get_by_role('dialog', name='清空所有 FocusFlow 数据？' if zh else 'Reset all FocusFlow data?', exact=True)
    dialog.get_by_role('button', name='清空所有数据' if zh else 'Reset all data', exact=True).click()
    page.keyboard.press('Escape')
    # Reset restores Chinese, while the history view remains mounted.
    expect(page.get_by_text('还没有专注历史', exact=True)).to_be_visible()
    expect(button('导出 CSV')).to_be_disabled()
    button('关闭提示：本地数据已重置').click()
    button('打开设置').click()
    page.get_by_label('备份文件', exact=True).set_input_files({'name': 'restore.json', 'mimeType': 'application/json', 'buffer': backup})
    expect(page.get_by_role('region', name='备份预览')).to_be_visible()
    button('确认并替换数据').click()
    page.keyboard.press('Escape')
    count(29)
    summary(27, 64)


with tempfile.TemporaryDirectory(prefix='focusflow-history-') as temporary, sync_playwright() as p:
    assert Path(temporary).resolve().parent == Path(tempfile.gettempdir()).resolve()
    for name, width, height, language, theme in [
        ('desktop-zh', 1440, 1000, 'zh-CN', 'light'), ('mobile-375-zh', 375, 812, 'zh-CN', 'light'),
        ('mobile-390-en-dark', 390, 844, 'en', 'dark'), ('landscape-en', 812, 375, 'en', 'light')]:
        if args.case and args.case != name:
            continue
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': width, 'height': height}, locale='en-US', timezone_id='Asia/Singapore', color_scheme=theme, accept_downloads=True)
        page = context.new_page()
        page.set_default_timeout(5000)
        page.set_default_navigation_timeout(30000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type in ('error', 'warning') else None)
        page.clock.install(time=NOW)
        try:
            navigate(page, args.url, retries)
            exercise(page, language, theme, name, temporary)
            results.append({'case': name, 'result': 'PASS'})
            print('PASS ' + name, flush=True)
        except Exception as error:
            import traceback
            traceback.print_exc()
            results.append({'case': name, 'result': 'FAIL', 'detail': str(error)})
            print('FAIL ' + name + ': ' + str(error), flush=True)
        finally:
            context.close()
            browser.close()
report = {'url': args.url, 'expected_version': args.expected_version,
          'case_filter': args.case,
          'clock': 'Script-controlled time; sample tasks; isolated Edge processes; real downloaded CSV files',
          'results': results, 'unexpected_errors': errors, 'navigation_retries': retries}
with Path(args.output).open('w', encoding='utf-8', newline='\n') as output:
    json.dump(report, output, ensure_ascii=False, indent=2)
    output.write('\n')
raise SystemExit(1 if errors or any(item['result'] != 'PASS' for item in results) else 0)
