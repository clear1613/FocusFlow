import type { PersistedAppData } from '../types';
import type { BackupDocument, BackupErrorCode, BackupPreview } from '../types/backup';
import { migratePersistedData } from './storageMigration';
import { validatePersistedAppData } from './storageSchema';
import { recoverPersistedTimer } from './timerRecoveryService';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(`Backup ${code}`);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// File imports must reject inconsistent state instead of invoking the startup
// fallback, which is allowed to discard corrupt data in ordinary storage loads.
export function validateBackupState(input: unknown): PersistedAppData {
  const validated = validatePersistedAppData(input);
  if (!validated.ok) throw new BackupError('invalid');
  const data = validated.data;
  const { timer } = data;
  const running = data.sessions.filter((session) => session.status === 'running');
  if (timer.remainingSeconds > timer.plannedDurationSeconds ||
      data.sessions.some((session) => session.actualDurationSeconds > session.plannedDurationSeconds)) {
    throw new BackupError('invalid');
  }
  if (timer.status === 'running' || timer.status === 'paused') {
    const session = running[0];
    if (running.length !== 1 || !session || session.id !== timer.activeSessionId ||
        session.type !== timer.mode || session.startedAt !== timer.startedAt ||
        session.plannedDurationSeconds !== timer.plannedDurationSeconds ||
        (timer.status === 'running' && (timer.endAt === null || timer.endAt < session.startedAt)) ||
        (timer.status === 'paused' && (timer.endAt !== null || timer.remainingSeconds <= 0))) {
      throw new BackupError('invalid');
    }
  } else if (timer.status !== 'idle' || running.length || timer.activeSessionId !== null || timer.endAt !== null || timer.startedAt !== null) {
    throw new BackupError('invalid');
  }
  return data;
}

function checkSize(raw: string): void {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new BackupError('size');
}

export function createBackup(data: PersistedAppData, now: number, appVersion: string): string {
  validateBackupState(data);
  const snapshot = recoverPersistedTimer(data, now).data;
  const document: BackupDocument = {
    format: 'focusflow-backup', backupVersion: 1,
    exportedAt: new Date(now).toISOString(), appVersion,
    data: snapshot,
  };
  const raw = JSON.stringify(document, null, 2);
  checkSize(raw);
  return raw;
}

export function inspectBackup(raw: string): BackupPreview {
  checkSize(raw);
  let input: unknown;
  try { input = JSON.parse(raw.replace(/^\uFEFF/, '')); }
  catch { throw new BackupError('parse'); }
  if (!record(input) || input.format !== 'focusflow-backup') throw new BackupError('format');
  if (input.backupVersion !== 1) throw new BackupError('version');
  if (typeof input.exportedAt !== 'string' || !Number.isFinite(Date.parse(input.exportedAt)) ||
      typeof input.appVersion !== 'string' || !input.appVersion.length) throw new BackupError('invalid');
  const migrated = migratePersistedData(input.data);
  if (!migrated.ok) throw new BackupError('version');
  const data = validateBackupState(migrated.value);
  const recovered = recoverPersistedTimer(data, Date.parse(input.exportedAt)).data;
  const pausedTimer = recovered.timer.status === 'running' || recovered.timer.status === 'paused';
  if (recovered.timer.status === 'running') {
    recovered.timer = { ...recovered.timer, status: 'paused', endAt: null };
  }
  validateBackupState(recovered);
  return { data: recovered, exportedAt: input.exportedAt, appVersion: input.appVersion, pausedTimer };
}
