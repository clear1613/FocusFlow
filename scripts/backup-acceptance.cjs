/* Run with Playwright available to Node (or NODE_PATH), using installed Edge. */
const { chromium, expect } = require('playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const options = { url: 'http://127.0.0.1:5173', output: 'docs/acceptance/backup-local.json', screenshotsDir: 'docs/screenshots/backup/local', expectedVersion: '1.3.0' };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = { '--url': 'url', '--output': 'output', '--screenshots-dir': 'screenshotsDir', '--expected-version': 'expectedVersion' }[process.argv[index]];
  if (!key || !process.argv[index + 1]) throw new Error('Unknown or missing argument: ' + process.argv[index]);
  options[key] = process.argv[index + 1];
}
const results = [], errors = [], expectedErrors = [], navigationRetries = [];
const assert = require('node:assert/strict');
const raw = (page) => page.evaluate(() => localStorage.getItem('focusflow:data'));

async function navigate(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await page.goto(options.url, { waitUntil: 'networkidle' }); }
    catch (error) {
      if (attempt === 2 || !/net::ERR_(CONNECTION_CLOSED|CONNECTION_RESET|NETWORK_CHANGED)/.test(String(error))) throw error;
      navigationRetries.push({ url: options.url, attempt: attempt + 1, error: String(error).split('\n')[0] });
      console.log('RETRY navigation: ' + String(error).split('\n')[0]);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function exercise(page, language, name, folder) {
  const zh = language === 'zh-CN';
  await page.locator('header select').first().selectOption(language);
  const labels = {
    settings: zh ? '打开设置' : 'Open settings', title: zh ? '任务名称' : 'Task name',
    add: zh ? '添加' : 'Add', export: zh ? '导出备份' : 'Export backup',
    preview: zh ? '备份预览' : 'Backup preview', confirm: zh ? '确认并替换数据' : 'Confirm and replace data',
    cancel: zh ? '取消导入' : 'Cancel import', file: zh ? '备份文件' : 'Backup file',
  };
  async function settings() {
    await page.getByRole('button', { name: labels.settings, exact: true }).click();
    await expect(page.getByText((zh ? 'FocusFlow 版本 ' : 'FocusFlow version ') + options.expectedVersion, { exact: true })).toBeVisible();
  }
  const button = (name) => page.getByRole('button', { name, exact: true });
  const upload = (text) => page.getByLabel(labels.file, { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('textbox', { name: labels.title, exact: true }).fill('备份任务 🍅');
  await button(labels.add).click();
  await page.locator('article').filter({ hasText: '备份任务 🍅' }).getByRole('button').nth(1).click();
  await button(zh ? '开始专注' : 'Start focus').click();
  await page.clock.fastForward(60_000);
  await settings();
  let before = await raw(page);
  const downloaded = page.waitForEvent('download');
  await button(labels.export).click();
  const download = await downloaded;
  assert(download.suggestedFilename().startsWith('focusflow-backup-'));
  const target = path.join(folder, name + '.json');
  await download.saveAs(target);
  const content = await fs.readFile(target, 'utf8');
  const document = JSON.parse(content);
  assert.equal(document.format, 'focusflow-backup');
  assert.equal(document.backupVersion, 1);
  assert.equal(document.data.tasks[0].title, '备份任务 🍅');
  assert.equal(document.data.timer.remainingSeconds, 1440);
  assert.equal(await raw(page), before, 'Export wrote application storage');
  await upload(content);
  await expect(page.getByRole('region', { name: labels.preview })).toBeVisible();
  assert.equal(await raw(page), before, 'Preview changed data');
  assert.equal(JSON.parse(await raw(page)).timer.status, 'running');
  await button(labels.cancel).click();
  assert.equal(await raw(page), before, 'Cancellation changed data');
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: labels.title, exact: true }).fill('后来创建的任务');
  await button(labels.add).click();
  await settings();
  await upload(content);
  await expect(page.getByRole('region', { name: labels.preview })).toBeVisible();
  await button(labels.confirm).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(options.screenshotsDir, name + '-preview.png'), fullPage: true });
  await button(labels.confirm).click();
  const restored = JSON.parse(await raw(page));
  assert.equal(restored.tasks.length, 1);
  assert.equal(restored.sessions.length, 1);
  assert.equal(restored.tasks[0].completedPomodoros, 0);
  assert.equal(restored.timer.status, 'paused');
  assert.equal(restored.timer.remainingSeconds, 1440);
  assert.equal(restored.timer.activeSessionId, document.data.timer.activeSessionId);
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(button(zh ? '继续专注' : 'Resume focus')).toBeVisible();
  assert.deepEqual(JSON.parse(await raw(page)).tasks, restored.tasks);
  await button(zh ? '继续专注' : 'Resume focus').click();
  await page.clock.fastForward(30_000);
  await button(zh ? '暂停一下' : 'Pause').click();
  const resumed = JSON.parse(await raw(page));
  assert.equal(resumed.timer.remainingSeconds, 1410);
  assert.equal(resumed.sessions.length, 1);
  await settings();
  for (const broken of ['{invalid', JSON.stringify({ ...document, backupVersion: 999 }), JSON.stringify({ ...document, data: { ...document.data, version: 999 } })]) {
    before = await raw(page);
    await upload(broken);
    await expect(page.getByRole('alert')).toBeVisible();
    assert.equal(await raw(page), before);
    await expect(button(labels.confirm)).toHaveCount(0);
  }
  await upload(content);
  await expect(page.getByRole('region', { name: labels.preview })).toBeVisible();
  before = await raw(page);
  await page.evaluate(() => {
    window.__backupSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('Injected quota failure', 'QuotaExceededError'); };
  });
  await button(labels.confirm).click();
  await expect(page.getByRole('alert')).toBeVisible();
  assert.equal(await raw(page), before);
  await page.evaluate(() => { Storage.prototype.setItem = window.__backupSetItem; });
  await button(labels.cancel).click();
  await page.keyboard.press('Escape');
  await expect(button(zh ? '继续专注' : 'Resume focus')).toBeVisible();
  assert.equal(JSON.parse(await raw(page)).timer.remainingSeconds, 1410);
}

(async () => {
  await fs.mkdir(options.screenshotsDir, { recursive: true });
  await fs.mkdir(path.dirname(options.output), { recursive: true });
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'focusflow-backup-acceptance-'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, width, height, language, theme] of [
      ['desktop-zh', 1440, 1000, 'zh-CN', 'light'], ['mobile-375-zh', 375, 812, 'zh-CN', 'light'],
      ['mobile-390-en-dark', 390, 844, 'en', 'dark'], ['landscape-en', 812, 375, 'en', 'light'],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US', timezoneId: 'Asia/Singapore', colorScheme: theme, acceptDownloads: true });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      page.setDefaultNavigationTimeout(30_000);
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error') (message.text().includes('[FocusFlow] Failed to persist app data.') ? expectedErrors : errors).push(message.text());
      });
      await page.clock.install({ time: new Date('2026-10-29T04:00:00Z') });
      try {
        await navigate(page);
        await exercise(page, language, name, temporary);
        results.push({ case: name, result: 'PASS' });
        console.log('PASS ' + name);
      } catch (error) {
        results.push({ case: name, result: 'FAIL', detail: String(error) });
        console.log('FAIL ' + name + ': ' + error);
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    const resolved = path.resolve(temporary);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('focusflow-backup-acceptance-')) {
      throw new Error('Refusing cleanup outside the acceptance temporary directory');
    }
    await fs.rm(resolved, { recursive: true, force: true });
    await fs.writeFile(options.output, JSON.stringify({ url: options.url, clock: 'script-controlled time; sample data; isolated Edge contexts', results, unexpected_errors: errors, injected_storage_errors: expectedErrors, navigation_retries: navigationRetries }, null, 2) + '\n');
  }
  if (errors.length || results.some((item) => item.result !== 'PASS')) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
