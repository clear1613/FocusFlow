import type { BackupPreview } from '../types/backup';
import { version } from '../../package.json';
import { STORAGE_VERSION } from '../constants/defaults';
import { useTaskStore } from '../stores/taskStore';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import { storageService } from './storageService';
import { notificationService } from './notificationService';
import { BackupError, createBackup, validateBackupState } from './backupService';

export function exportBackup(): { content: string; filename: string } {
  if (storageService.isWriteBlocked()) throw new BackupError('protected');
  const now = Date.now();
  return {
    content: createBackup({
      version: STORAGE_VERSION,
      tasks: useTaskStore.getState().tasks,
      activeTaskId: useTaskStore.getState().activeTaskId,
      sessions: useSessionStore.getState().sessions,
      settings: useSettingsStore.getState().settings,
      timer: useTimerStore.getState().timer,
    }, now, version),
    filename: `focusflow-backup-${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`,
  };
}

export function restoreBackup(preview: BackupPreview): void {
  if (storageService.isWriteBlocked()) throw new BackupError('protected');
  const data = validateBackupState(structuredClone(preview.data));
  if (data.timer.status === 'running') throw new BackupError('invalid');
  if (notificationService.getPermission() !== 'granted') data.settings.notificationEnabled = false;
  // A single atomic setItem is the commit point. A quota/permission failure
  // leaves both the existing storage string and all runtime stores untouched.
  if (!storageService.save(data)) throw new BackupError('storage');
  useTaskStore.getState().hydrate(data.tasks, data.activeTaskId);
  useSessionStore.getState().hydrate(data.sessions);
  useSettingsStore.getState().hydrate(data.settings);
  useTimerStore.getState().hydrate(data.timer);
  window.dispatchEvent(new Event('focusflow:storage-restored'));
}
