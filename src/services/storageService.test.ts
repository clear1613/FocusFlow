import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, createDefaultAppData } from '../constants/defaults';
import { storageService } from './storageService';
import { useTabStore } from '../stores/tabStore';

it.each(['reader', 'checking', 'unsupported'] as const)('blocks all persisted writes for a %s tab', (role) => {
  const saved = JSON.stringify(createDefaultAppData());
  localStorage.setItem(STORAGE_KEY, saved);
  useTabStore.setState({ role });
  expect(storageService.save(createDefaultAppData())).toBe(false);
  expect(storageService.clear()).toBe(false);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
});

describe('storageService', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when no data exists', () => {
    const result = storageService.load();
    expect(result.recovered).toBe(false);
    expect(result.data.version).toBe(2);
  });

  it('recovers safely from invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    const result = storageService.load();

    expect(result.recovered).toBe(true);
    expect(result.recoveryReason).toBe('parse_error');
    expect(result.data.tasks).toEqual([]);
  });

  it('recovers safely from a field-level schema violation', () => {
    const raw = createDefaultAppData();
    raw.settings.longBreakInterval = 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const result = storageService.load();
    expect(result.recovered).toBe(true);
    expect(result.recoveryReason).toBe('validation_error');
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it('reports legacy migration without treating it as corruption', () => {
    const defaults = createDefaultAppData();
    const legacy: {
      version: number;
      timer: Partial<typeof defaults.timer>;
      settings: Partial<typeof defaults.settings>;
    } & Omit<typeof defaults, 'timer' | 'settings'> = defaults;
    legacy.version = 0;
    delete legacy.timer.plannedDurationSeconds;
    delete legacy.timer.completedFocusCountInCycle;
    delete legacy.settings.theme;
    delete legacy.settings.autoStartFocus;
    delete legacy.settings.notificationEnabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const result = storageService.load();
    expect(result.recovered).toBe(false);
    expect(result.migrated).toBe(true);
    expect(result.migratedFromVersion).toBe(0);
    expect(result.data.version).toBe(2);
  });


  it('write-protects newer persisted schema versions until explicit clear', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));

    const result = storageService.load();
    expect(result.recovered).toBe(true);
    expect(result.recoveryReason).toBe('migration_error');
    expect(result.writeBlocked).toBe(true);
    expect(storageService.isWriteBlocked()).toBe(true);
    expect(storageService.save(createDefaultAppData())).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').version).toBe(999);

    expect(storageService.clear()).toBe(true);
    expect(storageService.isWriteBlocked()).toBe(false);
  });

  it('refuses to save invalid runtime data', () => {
    const invalid = createDefaultAppData();
    invalid.timer.remainingSeconds = -1;

    expect(storageService.save(invalid)).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('recovers without throwing when browser storage access is denied', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    });
    try {
      const result = storageService.load();
      expect(result.recovered).toBe(true);
      expect(result.recoveryReason).toBe('read_error');
      expect(result.data.tasks).toEqual([]);
    } finally {
      read.mockRestore();
    }
  });
});
