import { createDefaultAppData } from '../constants/defaults';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { storageService } from './storageService';

export function resetAppData(): boolean {
  const defaults = createDefaultAppData();
  const cleared = storageService.clear();

  if (!cleared) return false;

  useTaskStore.getState().hydrate(defaults.tasks, defaults.activeTaskId);
  useSessionStore.getState().hydrate(defaults.sessions);
  useSettingsStore.getState().hydrate(defaults.settings);
  useTimerStore.getState().hydrate(defaults.timer);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('focusflow:storage-reset'));
  }

  return true;
}
