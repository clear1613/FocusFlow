import { beforeEach, expect, it, vi, afterEach } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import { initializeApp } from './initializeApp';
import { storageService } from './storageService';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSessionStore } from '../stores/sessionStore';
import { createBackup, inspectBackup } from './backupService';
import { persistAppState } from './persistAppState';
import * as actions from './backupActions';

beforeEach(() => { localStorage.clear(); initializeApp(); });
afterEach(() => vi.restoreAllMocks());

it('exports current in-memory tasks even when they are newer than storage', () => {
  useTaskStore.getState().createTask({ title: 'Unsaved current task', estimatedPomodoros: 1 });
  const exported = actions.exportBackup();
  expect(inspectBackup(exported.content).data.tasks[0].title).toBe('Unsaved current task');
  expect(localStorage.getItem('focusflow:data')).toBeNull();
});

it('commits validated data before replacing stores and survives initialization', () => {
  const data = createDefaultAppData();
  data.settings.locale = 'en';
  data.settings.theme = 'dark';
  const preview = inspectBackup(createBackup(data, Date.now(), '1.2.0'));
  useTaskStore.getState().createTask({ title: 'Replace me', estimatedPomodoros: 1 });
  actions.restoreBackup(preview);
  expect(useTaskStore.getState().tasks).toEqual([]);
  expect(useSettingsStore.getState().settings.locale).toBe('en');
  expect(initializeApp()).toBeNull();
  expect(useSettingsStore.getState().settings.theme).toBe('dark');
});

it('keeps persisted and runtime data when storage rejects restoration', () => {
  useTaskStore.getState().createTask({ title: 'Keep me', estimatedPomodoros: 1 });
  persistAppState();
  const preview = inspectBackup(createBackup(createDefaultAppData(), Date.now(), '1.2.0'));
  const before = { tasks: useTaskStore.getState().tasks, timer: useTimerStore.getState().timer, sessions: useSessionStore.getState().sessions, settings: useSettingsStore.getState().settings };
  const raw = localStorage.getItem('focusflow:data');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
  expect(() => actions.restoreBackup(preview)).toThrow();
  expect(localStorage.getItem('focusflow:data')).toBe(raw);
  expect(useTaskStore.getState().tasks).toEqual(before.tasks);
  expect(useTimerStore.getState().timer).toEqual(before.timer);
  expect(useSettingsStore.getState().settings).toEqual(before.settings);
  expect(useSessionStore.getState().sessions).toEqual(before.sessions);
});

it('does not overwrite future-version data on export or restore', () => {
  const preview = inspectBackup(createBackup(createDefaultAppData(), Date.now(), '1.2.0'));
  const future = '{"version":999,"keep":"original"}';
  localStorage.setItem('focusflow:data', future);
  storageService.load();
  expect(() => actions.exportBackup()).toThrow();
  expect(() => actions.restoreBackup(preview)).toThrow();
  expect(localStorage.getItem('focusflow:data')).toBe(future);
});
