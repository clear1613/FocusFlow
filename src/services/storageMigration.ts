import {
  DEFAULT_SETTINGS,
  STORAGE_VERSION,
} from '../constants/defaults';
import type { PersistedAppData } from '../types';
import { getModeDurationSeconds } from '../utils/time';

export interface MigrationSuccess {
  ok: true;
  value: unknown;
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
}

export interface MigrationFailure {
  ok: false;
  value: null;
  migrated: false;
  fromVersion: number | null;
  toVersion: number;
  error: string;
}

export type MigrationResult = MigrationSuccess | MigrationFailure;

type Migration = (value: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readVersion(value: unknown): number | null {
  if (!isRecord(value)) return null;
  if (!('version' in value)) return 0;
  return Number.isInteger(value.version) ? (value.version as number) : null;
}

function migrateV0ToV1(value: Record<string, unknown>): Record<string, unknown> {
  const settingsInput = isRecord(value.settings) ? value.settings : {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...settingsInput,
  };

  const timerInput = isRecord(value.timer) ? value.timer : {};
  const mode =
    timerInput.mode === 'short_break' || timerInput.mode === 'long_break'
      ? timerInput.mode
      : 'focus';

  const plannedDurationSeconds =
    typeof timerInput.plannedDurationSeconds === 'number'
      ? timerInput.plannedDurationSeconds
      : getModeDurationSeconds(mode, settings as typeof DEFAULT_SETTINGS);

  return {
    ...value,
    version: 1,
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    activeTaskId: value.activeTaskId ?? null,
    settings,
    timer: {
      ...timerInput,
      mode,
      plannedDurationSeconds,
      completedFocusCountInCycle:
        typeof timerInput.completedFocusCountInCycle === 'number'
          ? timerInput.completedFocusCountInCycle
          : 0,
    },
  };
}

function migrateV1ToV2(value: Record<string, unknown>): Record<string, unknown> {
  return {
    ...value,
    version: 2,
    settings: isRecord(value.settings) ? {
      ...value.settings,
      locale: value.settings.locale === 'en' ? 'en' : 'zh-CN',
    } : value.settings,
  };
}

const migrations: Record<number, Migration> = {
  0: migrateV0ToV1,
  1: migrateV1ToV2,
};

export function migratePersistedData(value: unknown): MigrationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      value: null,
      migrated: false,
      fromVersion: null,
      toVersion: STORAGE_VERSION,
      error: 'Persisted data root must be an object.',
    };
  }

  const version = readVersion(value);
  if (version === null || version < 0) {
    return {
      ok: false,
      value: null,
      migrated: false,
      fromVersion: version,
      toVersion: STORAGE_VERSION,
      error: 'Persisted data has an invalid version.',
    };
  }

  if (version > STORAGE_VERSION) {
    return {
      ok: false,
      value: null,
      migrated: false,
      fromVersion: version,
      toVersion: STORAGE_VERSION,
      error: `Persisted data version ${version} is newer than supported version ${STORAGE_VERSION}.`,
    };
  }

  let currentVersion = version;
  let currentValue: Record<string, unknown> = { ...value };

  while (currentVersion < STORAGE_VERSION) {
    const migrate = migrations[currentVersion];
    if (!migrate) {
      return {
        ok: false,
        value: null,
        migrated: false,
        fromVersion: version,
        toVersion: STORAGE_VERSION,
        error: `No migration exists from version ${currentVersion}.`,
      };
    }

    currentValue = migrate(currentValue);
    currentVersion += 1;
  }

  // Unsupported locale preferences fall back without discarding business data.
  if (isRecord(currentValue.settings)) {
    currentValue.settings = {
      ...currentValue.settings,
      locale: currentValue.settings.locale === 'en' ? 'en' : 'zh-CN',
    };
  }

  return {
    ok: true,
    value: currentValue,
    migrated: version !== STORAGE_VERSION,
    fromVersion: version,
    toVersion: STORAGE_VERSION,
  };
}

// Keeps the imported app type visible to TypeScript when this module is
// refactored alongside future versioned migrations.
export type CurrentPersistedAppData = PersistedAppData;
