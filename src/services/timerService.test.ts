import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, createDefaultTimerState } from '../constants/defaults';
import {
  createIdleTimerForMode,
  getElapsedActiveSeconds,
  getNextModeAfterCompletion,
  getNextModeAfterSkip,
} from './timerService';

describe('timer transitions', () => {
  it('uses a short break before the long-break interval is reached', () => {
    expect(getNextModeAfterCompletion('focus', 0, 4)).toEqual({
      mode: 'short_break',
      completedFocusCountInCycle: 1,
    });
    expect(getNextModeAfterCompletion('focus', 2, 4)).toEqual({
      mode: 'short_break',
      completedFocusCountInCycle: 3,
    });
  });

  it('enters long break on the fourth completed focus and resets the cycle', () => {
    expect(getNextModeAfterCompletion('focus', 3, 4)).toEqual({
      mode: 'long_break',
      completedFocusCountInCycle: 0,
    });
  });

  it('returns to focus after either break', () => {
    expect(getNextModeAfterCompletion('short_break', 2, 4)).toEqual({
      mode: 'focus',
      completedFocusCountInCycle: 2,
    });
    expect(getNextModeAfterCompletion('long_break', 0, 4)).toEqual({
      mode: 'focus',
      completedFocusCountInCycle: 0,
    });
  });

  it('skip does not count a focus toward the long-break cycle', () => {
    expect(getNextModeAfterSkip('focus')).toBe('short_break');
    expect(getNextModeAfterSkip('short_break')).toBe('focus');
    expect(getNextModeAfterSkip('long_break')).toBe('focus');
  });
});

describe('timer duration accounting', () => {
  it('uses timestamp remaining time while running', () => {
    const timer = {
      ...createDefaultTimerState(),
      status: 'running' as const,
      plannedDurationSeconds: 1500,
      remainingSeconds: 1490,
      endAt: 1_500_000,
      startedAt: 0,
      activeSessionId: 'session-1',
    };

    expect(getElapsedActiveSeconds(timer, 600_000)).toBe(600);
  });

  it('uses frozen remaining time while paused', () => {
    const timer = {
      ...createDefaultTimerState(),
      status: 'paused' as const,
      plannedDurationSeconds: 1500,
      remainingSeconds: 1200,
      endAt: null,
      startedAt: 0,
      activeSessionId: 'session-1',
    };

    // Wall-clock `now` is intentionally huge: pause time must not be counted.
    expect(getElapsedActiveSeconds(timer, 99_000_000)).toBe(300);
  });

  it('creates a clean idle state without an active session', () => {
    const timer = createIdleTimerForMode(
      {
        ...createDefaultTimerState(),
        status: 'paused',
        activeSessionId: 'session-1',
        startedAt: 10,
        remainingSeconds: 20,
      },
      'long_break',
      DEFAULT_SETTINGS,
      0,
    );

    expect(timer.status).toBe('idle');
    expect(timer.activeSessionId).toBeNull();
    expect(timer.startedAt).toBeNull();
    expect(timer.endAt).toBeNull();
    expect(timer.remainingSeconds).toBe(15 * 60);
  });
});
