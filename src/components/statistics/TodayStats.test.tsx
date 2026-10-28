import { act, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { TodayStats } from './TodayStats';

afterEach(() => vi.useRealTimers());

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
  expect(stats.getByText('Pomodoros').parentElement).toHaveTextContent('1');
  act(() => { vi.advanceTimersByTime(60_001); });
  expect(stats.getByText('Pomodoros').parentElement).toHaveTextContent('0');
});
