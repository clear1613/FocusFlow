import type { PersistedAppData } from './storage';

export type BackupErrorCode = 'parse' | 'format' | 'version' | 'invalid' | 'size' | 'storage' | 'protected' | 'file' | 'download';

export interface BackupDocument {
  format: 'focusflow-backup';
  backupVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: PersistedAppData;
}

export interface BackupPreview {
  exportedAt: string;
  appVersion: string;
  data: PersistedAppData;
  pausedTimer: boolean;
}
