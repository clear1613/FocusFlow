import { describe, expect, it } from 'vitest';
import { migratePersistedData } from './storageMigration';
import { validatePersistedAppData } from './storageSchema';
import { createDefaultAppData } from '../constants/defaults';

describe('migratePersistedData', () => {
  it.each([undefined, 'en'])('upgrades V1 language settings to V2 while retaining business data (%s)', (locale) => {
    const legacy = JSON.parse(JSON.stringify(createDefaultAppData()));
    legacy.version = 1;
    if (locale === undefined) delete legacy.settings.locale;
    else legacy.settings.locale = locale;
    legacy.tasks = [{ id: 'kept', title: '已有任务', estimatedPomodoros: 2, completedPomodoros: 1, status: 'todo', createdAt: 1, completedAt: null }];
    legacy.activeTaskId = 'kept';
    const result = migratePersistedData(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    const validated = validatePersistedAppData(result.value);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(validated.errors.join(', '));
    expect(validated.data.version).toBe(2);
    expect(validated.data.settings.locale).toBe(locale ?? 'zh-CN');
    expect(validated.data.tasks).toEqual(legacy.tasks);
    expect(validated.data.timer).toEqual(legacy.timer);
    expect(validated.data.activeTaskId).toBe('kept');
  });

  it('migrates legacy V0 data through V1 to current V2', () => {
    const legacy = {
      version: 0,
      tasks: [],
      sessions: [],
      activeTaskId: null,
      timer: {
        mode: 'focus',
        status: 'idle',
        remainingSeconds: 1500,
        startedAt: null,
        endAt: null,
        activeSessionId: null,
      },
      settings: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreak: false,
        soundEnabled: true,
      },
    };

    const migrated = migratePersistedData(legacy);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    expect(migrated.migrated).toBe(true);
    expect(migrated.fromVersion).toBe(0);

    const validation = validatePersistedAppData(migrated.value);
    expect(validation.ok).toBe(true);
    if (!validation.ok) throw new Error(validation.errors.join(', '));
    const value = validation.data;
    expect(value.version).toBe(2);
    expect(value.timer.plannedDurationSeconds).toBe(1500);
    expect(value.timer.completedFocusCountInCycle).toBe(0);
    expect(value.settings.autoStartFocus).toBe(false);
    expect(value.settings.notificationEnabled).toBe(false);
    expect(value.settings.theme).toBe('system');
    expect(validatePersistedAppData(value).ok).toBe(true);
  });

  it('treats an unversioned legacy root as V0', () => {
    const legacy = {
      tasks: [],
      sessions: [],
      activeTaskId: null,
      timer: {
        mode: 'focus',
        status: 'idle',
        remainingSeconds: 1500,
        startedAt: null,
        endAt: null,
        activeSessionId: null,
      },
      settings: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreak: false,
        soundEnabled: true,
      },
    };

    const result = migratePersistedData(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fromVersion).toBe(0);
  });

  it('rejects future schema versions', () => {
    const result = migratePersistedData({ version: 999 });
    expect(result.ok).toBe(false);
  });
});
