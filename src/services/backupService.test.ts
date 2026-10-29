import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import type { PersistedAppData } from '../types';
import * as backup from './backupService';

const now = new Date('2026-10-29T04:00:00Z').getTime();
function fixture(): PersistedAppData {
  const data = createDefaultAppData();
  data.tasks = [{ id: 'task', title: '保留中文与 emoji 🍅', estimatedPomodoros: 2, completedPomodoros: 0, status: 'todo', createdAt: now - 100000, completedAt: null }];
  data.activeTaskId = 'task';
  data.sessions = [{ id: 'history', taskId: null, type: 'focus', status: 'completed', startedAt: now - 1600000, endedAt: now - 100000, completedAt: now - 100000, plannedDurationSeconds: 1500, actualDurationSeconds: 1500 }];
  return data;
}
function running() {
  const data = fixture();
  data.sessions = [{ id: 'session', taskId: 'task', type: 'focus', status: 'running', startedAt: now - 10000, endedAt: null, completedAt: null, plannedDurationSeconds: 1500, actualDurationSeconds: 0 }];
  data.timer = { ...data.timer, status: 'running', startedAt: now - 10000, endAt: now + 1490000, activeSessionId: 'session' };
  return data;
}

describe('backup format and validation', () => {
  it('exports all data and metadata without changing the original', () => {
    const data = fixture();
    const original = structuredClone(data);
    const raw = backup.createBackup(data, now, '1.2.0');
    const parsed = JSON.parse(raw);
    expect(parsed.format).toBe('focusflow-backup');
    expect(parsed.backupVersion).toBe(1);
    expect(parsed.exportedAt).toBe(new Date(now).toISOString());
    expect(parsed.data).toEqual(data);
    expect(backup.inspectBackup(raw).data).toEqual(data);
    expect(data).toEqual(original);
  });

  it('freezes a running backup at export time, retaining its Session without credit', () => {
    const data = running();
    const original = structuredClone(data);
    const preview = backup.inspectBackup(backup.createBackup(data, now, '1.2.0'));
    expect(preview.data.timer.status).toBe('paused');
    expect(preview.data.timer.endAt).toBeNull();
    expect(preview.data.timer.remainingSeconds).toBe(1490);
    expect(preview.data.timer.activeSessionId).toBe('session');
    expect(preview.data.tasks[0].completedPomodoros).toBe(0);
    expect(preview.data.sessions[0].status).toBe('running');
    expect(data).toEqual(original);
  });

  it('handles a deadline already reached at export once without mutating runtime data', () => {
    const data = running();
    const preview = backup.inspectBackup(backup.createBackup(data, now + 1500000, '1.2.0'));
    expect(preview.data.sessions[0].status).toBe('completed');
    expect(preview.data.tasks[0].completedPomodoros).toBe(1);
    expect(data.sessions[0].status).toBe('running');
  });

  it.each(['{bad', '{}', '{"format":"other"}'])('rejects invalid input %s', (raw) => {
    expect(() => backup.inspectBackup(raw)).toThrow();
  });

  it.each(['future-backup', 'future-data', 'fields', 'duplicate', 'orphan', 'timestamp'])('rejects incompatible or inconsistent %s data', (kind) => {
    const parsed = JSON.parse(backup.createBackup(fixture(), now, '1.2.0'));
    if (kind === 'future-backup') parsed.backupVersion = 999;
    if (kind === 'future-data') parsed.data.version = 999;
    if (kind === 'fields') parsed.data.settings.focusMinutes = -1;
    if (kind === 'duplicate') parsed.data.tasks.push(parsed.data.tasks[0]);
    if (kind === 'orphan') parsed.data.timer = { ...parsed.data.timer, status: 'paused', activeSessionId: 'missing' };
    if (kind === 'timestamp') parsed.exportedAt = 'not-a-date';
    expect(() => backup.inspectBackup(JSON.stringify(parsed))).toThrow();
  });

  it('migrates older data without losing tasks', () => {
    const parsed = JSON.parse(backup.createBackup(fixture(), now, '1.2.0'));
    parsed.data.version = 1;
    delete parsed.data.settings.locale;
    const preview = backup.inspectBackup(JSON.stringify(parsed));
    expect(preview.data.version).toBe(2);
    expect(preview.data.settings.locale).toBe('zh-CN');
    expect(preview.data.tasks[0].title).toBe(fixture().tasks[0].title);
  });

  it('rejects oversized files before parsing', () => {
    expect(() => backup.inspectBackup(' '.repeat(backup.MAX_BACKUP_BYTES + 1))).toThrow();
  });
});
