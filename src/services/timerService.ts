import type { AppSettings, TimerMode, TimerState } from '../types';
import { getModeDurationSeconds, getRemainingSeconds } from '../utils/time';

export interface NextModeResult {
  mode: TimerMode;
  completedFocusCountInCycle: number;
}

export function getNextModeAfterCompletion(
  currentMode: TimerMode,
  completedFocusCountInCycle: number,
  longBreakInterval: number,
): NextModeResult {
  if (currentMode !== 'focus') {
    return {
      mode: 'focus',
      completedFocusCountInCycle,
    };
  }

  const nextCount = completedFocusCountInCycle + 1;

  if (nextCount >= Math.max(1, longBreakInterval)) {
    return {
      mode: 'long_break',
      completedFocusCountInCycle: 0,
    };
  }

  return {
    mode: 'short_break',
    completedFocusCountInCycle: nextCount,
  };
}

export function getNextModeAfterSkip(currentMode: TimerMode): TimerMode {
  return currentMode === 'focus' ? 'short_break' : 'focus';
}

export function getRunningRemainingSeconds(
  timer: TimerState,
  now: number,
): number {
  if (timer.status !== 'running' || timer.endAt === null) {
    return timer.remainingSeconds;
  }

  return getRemainingSeconds(timer.endAt, now);
}

export function getElapsedActiveSeconds(timer: TimerState, now: number): number {
  const remaining = getRunningRemainingSeconds(timer, now);
  return Math.max(0, timer.plannedDurationSeconds - remaining);
}

export function createIdleTimerForMode(
  previous: TimerState,
  mode: TimerMode,
  settings: AppSettings,
  completedFocusCountInCycle = previous.completedFocusCountInCycle,
): TimerState {
  const duration = getModeDurationSeconds(mode, settings);

  return {
    ...previous,
    mode,
    status: 'idle',
    remainingSeconds: duration,
    plannedDurationSeconds: duration,
    startedAt: null,
    endAt: null,
    activeSessionId: null,
    completedFocusCountInCycle,
  };
}
