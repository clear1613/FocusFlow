import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { showToast } from '../stores/toastStore';
import { useTimerStore } from '../stores/timerStore';
import { notificationService } from './notificationService';
import { storageService } from './storageService';
import { recoverPersistedTimer } from './timerRecoveryService';
import { getText } from './i18n';
import type { PersistedAppData } from '../types';

export type StorageNotice = 'recovered' | 'migrated' | 'incompatible' | null;

// Hydrate before mounting React so child effects cannot run against partial
// state and StrictMode cannot replay startup persistence or recovery feedback.
function hydrateApp(data: PersistedAppData): void {
  useTaskStore.getState().hydrate(data.tasks, data.activeTaskId);
  useSessionStore.getState().hydrate(data.sessions);
  useSettingsStore.getState().hydrate(data.settings);
  useTimerStore.getState().hydrate(data.timer);
}

export function initializeApp({ readOnly = false }: { readOnly?: boolean } = {}): StorageNotice {
  const loaded = storageService.load();
  if (readOnly) {
    hydrateApp(loaded.data);
    return null;
  }
  const recovery = recoverPersistedTimer(loaded.data, Date.now());
  const data = recovery.data;
  const revokeNotifications = data.settings.notificationEnabled &&
    notificationService.getPermission() !== 'granted';
  if (revokeNotifications) data.settings.notificationEnabled = false;

  hydrateApp(data);

  if (!loaded.writeBlocked && (recovery.changed || loaded.migrated || revokeNotifications ||
    (loaded.recovered && loaded.recoveryReason !== 'read_error'))) {
    storageService.save(data);
  }

  const notice: StorageNotice = loaded.writeBlocked ? 'incompatible' :
    loaded.recovered ? 'recovered' : loaded.migrated ? 'migrated' : null;
  if (notice) {
    showToast({
      title: getText(notice === 'incompatible' ? 'storageProtected' :
        notice === 'recovered' ? 'storageRecovery' : 'storageMigrated'),
      description: getText(notice === 'incompatible' ? 'storageProtectedDescription' :
        notice === 'recovered' ? 'storageRecoveryDescription' : 'storageMigratedDescription'),
      tone: notice === 'migrated' ? 'success' : 'warning',
    });
  }
  if (recovery.completedExpiredSession) {
    showToast({
      title: getText(loaded.data.timer.mode === 'focus' ? 'focusComplete' : 'breakComplete'),
      description: getText('recoveredCompletion'),
      tone: 'success',
    });
  }
  return notice;
}
