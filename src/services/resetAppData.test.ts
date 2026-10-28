import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../constants/defaults';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { resetAppData } from './resetAppData';

describe('resetAppData', () => {
  beforeEach(() => localStorage.clear());

  it('clears persisted data and resets all stores', () => {
    useTaskStore.getState().createTask({ title: 'Temporary', estimatedPomodoros: 2 });
    useTaskStore.getState().setActiveTask(useTaskStore.getState().tasks[0].id);
    useSettingsStore.getState().patch({ focusMinutes: 50 });
    useTimerStore.getState().patch({ remainingSeconds: 123 });
    localStorage.setItem(STORAGE_KEY, '{}');

    expect(resetAppData()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(useTaskStore.getState().tasks).toEqual([]);
    expect(useTaskStore.getState().activeTaskId).toBeNull();
    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(useSettingsStore.getState().settings.focusMinutes).toBe(25);
    expect(useTimerStore.getState().timer.remainingSeconds).toBe(1500);
  });
});
