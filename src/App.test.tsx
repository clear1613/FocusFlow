import { fireEvent, render, screen, within } from '@testing-library/react';
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

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('opens in Chinese with a labelled language selector', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '今日概览' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '任务清单' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开始' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: '界面语言' })).toHaveValue('zh-CN');
  expect(document.documentElement.lang).toBe('zh-CN');
});

it('switches both ways while preserving the active session, task and input draft', () => {
  useTaskStore.getState().createTask({ title: '保留我的任务', estimatedPomodoros: 2 });
  useTaskStore.getState().setActiveTask(useTaskStore.getState().tasks[0].id);
  render(<App />);
  fireEvent.change(screen.getByRole('textbox', { name: '任务名称' }), { target: { value: '未提交的草稿' } });
  fireEvent.click(screen.getByRole('button', { name: '开始' }));
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

  fireEvent.click(within(screen.getByRole('region', { name: 'Pomodoro timer' })).getByRole('button', { name: 'Reset' }));
  expect(screen.getByRole('dialog', { name: 'Reset current timer?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Interface language' }), { target: { value: 'zh-CN' } });
  expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument();
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
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
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
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  expect(localStorage.getItem('focusflow:data')).toBe(future);
});
