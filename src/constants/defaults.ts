import type { AppSettings, PersistedAppData, TimerState } from '../types';

export const STORAGE_KEY = 'focusflow:data';
export const STORAGE_VERSION = 2;

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'zh-CN',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationEnabled: false,
  theme: 'system',
};

export const createDefaultTimerState = (
  focusMinutes = DEFAULT_SETTINGS.focusMinutes,
): TimerState => ({
  mode: 'focus',
  status: 'idle',
  remainingSeconds: focusMinutes * 60,
  plannedDurationSeconds: focusMinutes * 60,
  startedAt: null,
  endAt: null,
  activeSessionId: null,
  completedFocusCountInCycle: 0,
});

export const createDefaultAppData = (): PersistedAppData => ({
  version: STORAGE_VERSION,
  tasks: [],
  sessions: [],
  activeTaskId: null,
  timer: createDefaultTimerState(),
  settings: { ...DEFAULT_SETTINGS },
});
