import { STORAGE_VERSION } from '../constants/defaults';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { storageService } from './storageService';

export function persistAppState(): void {
  const timer = useTimerStore.getState().timer;
  const { tasks, activeTaskId } = useTaskStore.getState();
  const sessions = useSessionStore.getState().sessions;
  const settings = useSettingsStore.getState().settings;

  storageService.save({
    version: STORAGE_VERSION,
    tasks,
    sessions,
    activeTaskId,
    timer,
    settings,
  });
}
