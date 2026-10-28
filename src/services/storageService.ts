import {
  STORAGE_KEY,
  createDefaultAppData,
} from '../constants/defaults';
import type { PersistedAppData } from '../types';
import { migratePersistedData } from './storageMigration';
import { validatePersistedAppData } from './storageSchema';

export type StorageRecoveryReason =
  | 'read_error'
  | 'parse_error'
  | 'migration_error'
  | 'validation_error'
  | null;

let writeBlockedByIncompatibleVersion = false;

export interface LoadResult {
  data: PersistedAppData;
  recovered: boolean;
  recoveryReason: StorageRecoveryReason;
  migrated: boolean;
  migratedFromVersion: number | null;
  validationErrors: string[];
  writeBlocked: boolean;
}

function fallback(
  recoveryReason: Exclude<StorageRecoveryReason, null>,
  validationErrors: string[] = [],
): LoadResult {
  return {
    data: createDefaultAppData(),
    recovered: true,
    recoveryReason,
    migrated: false,
    migratedFromVersion: null,
    validationErrors,
    writeBlocked: recoveryReason === 'migration_error',
  };
}

export const storageService = {
  load(): LoadResult {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[FocusFlow] Failed to read persisted data.', error);
      return fallback('read_error');
    }

    if (!raw) {
      writeBlockedByIncompatibleVersion = false;
      return {
        data: createDefaultAppData(),
        recovered: false,
        recoveryReason: null,
        migrated: false,
        migratedFromVersion: null,
        validationErrors: [],
        writeBlocked: false,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn('[FocusFlow] Failed to parse persisted data.', error);
      writeBlockedByIncompatibleVersion = false;
      return fallback('parse_error');
    }

    const migration = migratePersistedData(parsed);
    if (!migration.ok) {
      console.warn('[FocusFlow] Failed to migrate persisted data.', migration.error);
      writeBlockedByIncompatibleVersion = true;
      return fallback('migration_error', [migration.error]);
    }

    const validation = validatePersistedAppData(migration.value);
    if (!validation.ok) {
      console.warn(
        '[FocusFlow] Persisted data failed schema validation.',
        validation.errors,
      );
      writeBlockedByIncompatibleVersion = false;
      return fallback('validation_error', validation.errors);
    }

    writeBlockedByIncompatibleVersion = false;
    return {
      data: validation.data,
      recovered: false,
      recoveryReason: null,
      migrated: migration.migrated,
      migratedFromVersion: migration.migrated ? migration.fromVersion : null,
      validationErrors: [],
      writeBlocked: false,
    };
  },

  save(data: PersistedAppData): boolean {
    if (writeBlockedByIncompatibleVersion) {
      console.warn(
        '[FocusFlow] Persistence is write-protected because stored data uses an incompatible schema version.',
      );
      return false;
    }

    const validation = validatePersistedAppData(data);
    if (!validation.ok) {
      console.error(
        '[FocusFlow] Refusing to persist invalid app data.',
        validation.errors,
      );
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
      return true;
    } catch (error) {
      console.error('[FocusFlow] Failed to persist app data.', error);
      return false;
    }
  },

  clear(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      writeBlockedByIncompatibleVersion = false;
      return true;
    } catch (error) {
      console.error('[FocusFlow] Failed to clear persisted data.', error);
      return false;
    }
  },

  isWriteBlocked(): boolean {
    return writeBlockedByIncompatibleVersion;
  },
};
