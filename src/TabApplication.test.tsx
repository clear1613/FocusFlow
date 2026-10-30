import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TabApplication } from './TabApplication';
// These tests cover permission transitions; actual lazy delivery is verified
// against the built site, including deliberately interrupted chunk requests.
import './components/task/TaskList';
import './components/statistics/WeeklyChart';
import { createDefaultAppData } from './constants/defaults';
import { useTabStore } from './stores/tabStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTaskStore } from './stores/taskStore';
import { useSessionStore } from './stores/sessionStore';
import { useTimerStore } from './stores/timerStore';

beforeEach(() => {
  const data = createDefaultAppData();
  useSettingsStore.getState().hydrate(data.settings);
  useTaskStore.getState().hydrate([], null);
  useSessionStore.getState().hydrate([]);
  useTimerStore.getState().hydrate(data.timer);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('shows a live read-only timer without task/settings mutation controls', () => {
  vi.useFakeTimers(); vi.setSystemTime(100000);
  useTabStore.setState({ role: 'reader' });
  useTaskStore.getState().hydrate([{ id: 'a', title: '同步任务', status: 'todo', estimatedPomodoros: 1, completedPomodoros: 0, createdAt: 1, completedAt: null }], 'a');
  useTimerStore.getState().patch({ status: 'running', remainingSeconds: 60, endAt: 160000 });
  render(<TabApplication />);
  expect(screen.getByRole('heading', { name: '此窗口正在同步查看' })).toBeVisible();
  expect(screen.getByText('同步任务')).toBeVisible();
  expect(screen.getByText('01:00')).toBeVisible();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: '打开设置' })).toBeNull();
  act(() => vi.advanceTimersByTime(65000));
  expect(screen.getByText('00:00')).toBeVisible();
  expect(useTimerStore.getState().timer.status).toBe('running');
});

it('explains unavailable coordination in English without enabling writes', () => {
  useSettingsStore.getState().patch({ locale: 'en' });
  useTabStore.setState({ role: 'unsupported' });
  render(<TabApplication />);
  expect(screen.getByRole('heading', { name: 'This browser is in read-only mode' })).toBeVisible();
  expect(screen.getByText(/Open FocusFlow in an up-to-date browser/)).toBeVisible();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.documentElement.lang).toBe('en');
});

it('enables the working view only after the coordinator grants writer access', async () => {
  useTabStore.setState({ role: 'reader' });
  render(<TabApplication />);
  expect(screen.queryByRole('textbox')).toBeNull();
  await act(async () => { useTabStore.setState({ role: 'writer' }); await vi.dynamicImportSettled(); });
  expect(screen.getByRole('textbox', { name: '任务名称' })).toBeVisible();
});
