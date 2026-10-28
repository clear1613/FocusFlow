import { act, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { TodayStats } from './TodayStats';

afterEach(() => vi.useRealTimers());

function sessionOn(day: number, completedAt: number) {
  return {
    id: `session-${day}`,
    taskId: null,
    type: 'focus' as const,
    status: 'completed' as const,
    startedAt: completedAt - 1_500_000,
    endedAt: completedAt,
    plannedDurationSeconds: 1500,
    actualDurationSeconds: 1500,
    completedAt,
  };
}

it('updates the natural day when an idle page crosses midnight', () => {
  useSettingsStore.getState().patch({ locale: 'en' });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 23, 59));
  const done = new Date(2026, 9, 24, 12).getTime();
  useTaskStore.getState().hydrate([], null);
  useSessionStore.getState().hydrate([{
    id: 'yesterday', taskId: null, type: 'focus', status: 'completed',
    startedAt: done - 1_500_000, endedAt: done, completedAt: done,
    plannedDurationSeconds: 1500, actualDurationSeconds: 1500,
  }]);
  render(<TodayStats />);
  const stats = within(screen.getByRole('region', { name: 'Today' }));
  expect(stats.getByText('Focused for 25 min')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(60_001); });
  expect(stats.getByText('No focus sessions yet today')).toBeInTheDocument();
});

it('reads as a sentence and keeps the streak as the secondary line', () => {
  useSettingsStore.getState().patch({ locale: 'zh-CN' });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 20, 0));
  useTaskStore.getState().hydrate([], null);
  useSessionStore.getState().hydrate([
    sessionOn(23, new Date(2026, 9, 23, 10).getTime()),
    sessionOn(24, new Date(2026, 9, 24, 10).getTime()),
  ]);

  render(<TodayStats />);
  const stats = within(screen.getByRole('region', { name: '今日概览' }));

  expect(stats.getByText('已专注 25 分钟')).toBeInTheDocument();
  expect(stats.getByText('1 次专注 · 完成 0 个任务')).toBeInTheDocument();
  expect(stats.getByText('连续第 2 天')).toBeInTheDocument();
});
