import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { createDefaultAppData } from './constants/defaults';
import { initializeApp } from './services/initializeApp';
import { storageService } from './services/storageService';
import { useSessionStore } from './stores/sessionStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTaskStore } from './stores/taskStore';
import { useTimerStore } from './stores/timerStore';
import { useToastStore } from './stores/toastStore';

beforeEach(() => {
  localStorage.clear();
  storageService.load();
  const data = createDefaultAppData();
  useSettingsStore.getState().hydrate({ ...data.settings, soundEnabled: false });
  useTimerStore.getState().hydrate(data.timer);
  useSessionStore.getState().hydrate([]);
  useTaskStore.getState().hydrate([], null);
  useToastStore.getState().clear();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // JSDOM has no layout engine; provide chart dimensions without mocking the UI.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800, height: 224, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 224,
    toJSON() { return {}; },
  });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('keeps the timer and task draft alive while viewing history and completes a session once', () => {
  vi.useFakeTimers();
  useSettingsStore.getState().patch({ focusMinutes: 1 });
  useTaskStore.getState().createTask({ title: '完成后进入历史', estimatedPomodoros: 1 });
  useTaskStore.getState().setActiveTask(useTaskStore.getState().tasks[0].id);
  render(<App />);
  fireEvent.change(screen.getByRole('textbox', { name: '任务名称' }), { target: { value: '保留输入草稿' } });
  fireEvent.click(screen.getByRole('button', { name: '开始专注' }));
  const id = useTimerStore.getState().timer.activeSessionId;
  fireEvent.click(screen.getByRole('button', { name: '查看专注历史' }));
  expect(screen.queryByRole('button', { name: '暂停一下' })).toBeNull();
  act(() => vi.advanceTimersByTime(61000));
  expect(useSessionStore.getState().sessions).toHaveLength(1);
  expect(useSessionStore.getState().sessions[0]).toMatchObject({ id, status: 'completed' });
  expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(1);
  expect(screen.getByText('1 次完成 · 专注 1 分钟')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '返回专注' }));
  expect(screen.getByRole('textbox', { name: '任务名称' })).toHaveValue('保留输入草稿');
  expect(screen.getByRole('button', { name: '开始休息' })).toBeVisible();
});

it('opens in Chinese with the timer first and settings behind an icon', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '今日概览' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '任务清单' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开始专注' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: '界面语言' })).toHaveValue('zh-CN');
  expect(document.documentElement.lang).toBe('zh-CN');

  // Settings are not part of the main screen any more: they open from the header.
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '打开设置' }));
  const dialog = within(screen.getByRole('dialog', { name: '设置' }));
  expect(dialog.getByRole('switch', { name: '声音提醒' })).toBeInTheDocument();
  expect(dialog.getByRole('spinbutton', { name: '专注' })).toBeInTheDocument();
});

it('switches both ways while preserving the active session, task and input draft', () => {
  useTaskStore.getState().createTask({ title: '保留我的任务', estimatedPomodoros: 2 });
  useTaskStore.getState().setActiveTask(useTaskStore.getState().tasks[0].id);
  render(<App />);
  fireEvent.change(screen.getByRole('textbox', { name: '任务名称' }), { target: { value: '未提交的草稿' } });
  fireEvent.click(screen.getByRole('button', { name: '开始专注' }));
  const timer = useTimerStore.getState().timer;
  const sessions = useSessionStore.getState().sessions;
  const tasks = useTaskStore.getState().tasks;

  fireEvent.change(screen.getByRole('combobox', { name: '界面语言' }), { target: { value: 'en' } });
  expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Task name' })).toHaveValue('未提交的草稿');
  expect(document.documentElement.lang).toBe('en');
  expect(useTimerStore.getState().timer).toEqual(timer);
  expect(useSessionStore.getState().sessions).toEqual(sessions);
  expect(useTaskStore.getState().tasks).toEqual(tasks);
  expect(JSON.parse(localStorage.getItem('focusflow:data')!).settings.locale).toBe('en');

  fireEvent.click(within(screen.getByRole('region', { name: 'Pomodoro timer' })).getByRole('button', { name: 'End this round' }));
  expect(screen.getByRole('dialog', { name: 'Reset current timer?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Interface language' }), { target: { value: 'zh-CN' } });
  expect(screen.getByRole('button', { name: '暂停一下' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '任务名称' })).toHaveValue('未提交的草稿');
  expect(useTimerStore.getState().timer.activeSessionId).toBe(timer.activeSessionId);
});

it('restores English after reinitializing from persisted settings', () => {
  const first = render(<App />);
  fireEvent.change(screen.getByRole('combobox', { name: '界面语言' }), { target: { value: 'en' } });
  first.unmount();
  useSettingsStore.getState().reset();
  initializeApp();
  render(<App />);
  expect(screen.getByRole('combobox', { name: 'Interface language' })).toHaveValue('en');
  expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument();
});

it.each([undefined, 'unsupported'])('loads older or unsupported language preferences without losing business data (%s)', (locale) => {
  const data = createDefaultAppData();
  data.tasks = [{ id: 'kept', title: '已有任务', estimatedPomodoros: 2, completedPomodoros: 1, status: 'todo', createdAt: 1, completedAt: null }];
  data.activeTaskId = 'kept';
  const raw = JSON.parse(JSON.stringify(data));
  if (locale === undefined) delete raw.settings.locale;
  else raw.settings.locale = locale;
  localStorage.setItem('focusflow:data', JSON.stringify(raw));

  expect(initializeApp()).toBeNull();
  expect(useSettingsStore.getState().settings.locale).toBe('zh-CN');
  expect(useTaskStore.getState().tasks).toEqual(data.tasks);
  expect(useTaskStore.getState().activeTaskId).toBe('kept');
});

it('preserves future-version data when switching language under write protection', () => {
  const future = '{"version":999,"keep":"original"}';
  localStorage.setItem('focusflow:data', future);
  const notice = initializeApp();
  render(<App initialStorageNotice={notice} />);
  fireEvent.change(screen.getByRole('combobox', { name: '界面语言' }), { target: { value: 'en' } });
  expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument();
  expect(localStorage.getItem('focusflow:data')).toBe(future);
});
