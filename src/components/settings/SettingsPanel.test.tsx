import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { createDefaultAppData } from '../../constants/defaults';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTimerStore } from '../../stores/timerStore';
import { useTaskStore } from '../../stores/taskStore';
import { useSessionStore } from '../../stores/sessionStore';
import { SettingsPanel } from './SettingsPanel';

beforeEach(() => {
  localStorage.clear();
  const data = createDefaultAppData();
  useSettingsStore.getState().hydrate({ ...data.settings, locale: 'en' });
  useTimerStore.getState().hydrate(data.timer);
  useTaskStore.getState().hydrate([], null);
  useSessionStore.getState().hydrate([]);
});

it('keeps fractional input from invalidating persisted settings', () => {
  render(<SettingsPanel />);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Focus' }), {
    target: { value: '25.5' },
  });
  expect(useSettingsStore.getState().settings.focusMinutes).toBe(25);
  expect(JSON.parse(localStorage.getItem('focusflow:data')!).settings.focusMinutes).toBe(25);
});

it.each(['running', 'paused'] as const)('changes only the next duration while %s', (status) => {
  useTimerStore.getState().patch({ status });
  render(<SettingsPanel />);
  const timer = useTimerStore.getState().timer;
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Focus' }), {
    target: { value: '50' },
  });
  expect(useSettingsStore.getState().settings.focusMinutes).toBe(50);
  expect(useTimerStore.getState().timer).toEqual(timer);
});
