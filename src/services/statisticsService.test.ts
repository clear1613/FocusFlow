import { describe, expect, it } from 'vitest';
import type { FocusSession, Task } from '../types';
import {
  getCurrentStreak,
  getLast7DaysFocusMinutes,
  getTodayStats,
} from './statisticsService';

function localTime(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function focusSession(
  id: string,
  completedAt: number,
  actualDurationSeconds = 25 * 60,
  overrides: Partial<FocusSession> = {},
): FocusSession {
  return {
    id,
    taskId: null,
    type: 'focus',
    status: 'completed',
    startedAt: completedAt - actualDurationSeconds * 1000,
    endedAt: completedAt,
    plannedDurationSeconds: actualDurationSeconds,
    actualDurationSeconds,
    completedAt,
    ...overrides,
  };
}

function task(
  id: string,
  completedAt: number | null,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    title: id,
    estimatedPomodoros: 1,
    completedPomodoros: completedAt === null ? 0 : 1,
    status: completedAt === null ? 'todo' : 'completed',
    createdAt: localTime(2026, 10, 1),
    completedAt,
    ...overrides,
  };
}

describe('getTodayStats', () => {
  it('counts only completed focus sessions from the local natural day', () => {
    const now = new Date(2026, 9, 24, 15, 0, 0);
    const sessions = [
      focusSession('today-1', localTime(2026, 10, 24, 9)),
      focusSession('today-2', localTime(2026, 10, 24, 14)),
      focusSession('yesterday', localTime(2026, 10, 23, 23, 59)),
      focusSession('cancelled', localTime(2026, 10, 24, 10), 600, {
        status: 'cancelled',
        completedAt: null,
      }),
      focusSession('skipped', localTime(2026, 10, 24, 11), 600, {
        status: 'skipped',
        completedAt: null,
      }),
      focusSession('break', localTime(2026, 10, 24, 12), 300, {
        type: 'short_break',
      }),
    ];

    const tasks = [
      task('done-today', localTime(2026, 10, 24, 13)),
      task('done-yesterday', localTime(2026, 10, 23, 13)),
      task('open', null),
    ];

    expect(getTodayStats(sessions, tasks, now)).toMatchObject({
      pomodoros: 2,
      focusMinutes: 50,
      completedTasks: 1,
    });
  });

  it('uses each session actual duration instead of the current timer setting', () => {
    const now = new Date(2026, 9, 24, 20, 0, 0);
    const sessions = [
      focusSession('old-25', localTime(2026, 10, 24, 10), 25 * 60, {
        plannedDurationSeconds: 25 * 60,
      }),
      focusSession('new-50', localTime(2026, 10, 24, 18), 50 * 60, {
        plannedDurationSeconds: 50 * 60,
      }),
    ];

    // Statistics does not accept Settings at all, so changing the current
    // configured focus duration cannot rewrite these historical 75 minutes.
    expect(getTodayStats(sessions, [], now).focusMinutes).toBe(75);
  });

  it('keeps focus analytics after the linked task has been deleted', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const session = focusSession(
      'deleted-task-session',
      localTime(2026, 10, 24, 10),
      25 * 60,
      { taskId: 'deleted-task' },
    );

    expect(getTodayStats([session], [], now)).toMatchObject({
      pomodoros: 1,
      focusMinutes: 25,
    });
    expect(getLast7DaysFocusMinutes([session], now).at(-1)?.minutes).toBe(25);
  });

  it('attributes a cross-midnight session to the day it completed', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const completedAt = localTime(2026, 10, 24, 0, 10);
    const session = focusSession('cross-midnight', completedAt, 25 * 60, {
      startedAt: localTime(2026, 10, 23, 23, 45),
    });

    expect(getTodayStats([session], [], now)).toMatchObject({
      pomodoros: 1,
      focusMinutes: 25,
    });
  });
});

describe('getLast7DaysFocusMinutes', () => {
  it('returns exactly seven consecutive local days and zero-fills missing days', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const sessions = [
      focusSession('18th', localTime(2026, 10, 18, 9), 10 * 60),
      focusSession('21st', localTime(2026, 10, 21, 9), 20 * 60),
      focusSession('24th-a', localTime(2026, 10, 24, 9), 25 * 60),
      focusSession('24th-b', localTime(2026, 10, 24, 10), 50 * 60),
    ];

    const result = getLast7DaysFocusMinutes(sessions, now);

    expect(result).toHaveLength(7);
    expect(result.map((item) => item.minutes)).toEqual([
      10, 0, 0, 20, 0, 0, 75,
    ]);
  });

  it('excludes cancelled, skipped and break sessions from weekly focus minutes', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const completedAt = localTime(2026, 10, 24, 9);
    const sessions = [
      focusSession('focus', completedAt, 25 * 60),
      focusSession('cancelled', completedAt, 20 * 60, {
        status: 'cancelled',
        completedAt: null,
      }),
      focusSession('skipped', completedAt, 10 * 60, {
        status: 'skipped',
        completedAt: null,
      }),
      focusSession('break', completedAt, 15 * 60, {
        type: 'long_break',
      }),
    ];

    expect(getLast7DaysFocusMinutes(sessions, now).at(-1)?.minutes).toBe(25);
  });
});

describe('getCurrentStreak', () => {
  it('counts consecutive active days including today', () => {
    const now = new Date(2026, 9, 24, 15, 0, 0);
    const sessions = [
      focusSession('d24', localTime(2026, 10, 24, 9)),
      focusSession('d23', localTime(2026, 10, 23, 9)),
      focusSession('d22', localTime(2026, 10, 22, 9)),
    ];

    expect(getCurrentStreak(sessions, now)).toBe(3);
  });

  it('keeps yesterday streak during the current day grace window', () => {
    const now = new Date(2026, 9, 24, 10, 0, 0);
    const sessions = [
      focusSession('d23', localTime(2026, 10, 23, 9)),
      focusSession('d22', localTime(2026, 10, 22, 9)),
      focusSession('d21', localTime(2026, 10, 21, 9)),
    ];

    expect(getCurrentStreak(sessions, now)).toBe(3);
  });

  it('returns zero after a fully missed day breaks the streak', () => {
    const now = new Date(2026, 9, 24, 10, 0, 0);
    const sessions = [
      focusSession('d22', localTime(2026, 10, 22, 9)),
      focusSession('d21', localTime(2026, 10, 21, 9)),
    ];

    expect(getCurrentStreak(sessions, now)).toBe(0);
  });

  it('counts multiple sessions on one day as one streak day', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const sessions = [
      focusSession('d24-a', localTime(2026, 10, 24, 9)),
      focusSession('d24-b', localTime(2026, 10, 24, 10)),
      focusSession('d23', localTime(2026, 10, 23, 9)),
    ];

    expect(getCurrentStreak(sessions, now)).toBe(2);
  });

  it('ignores non-completed focus sessions for streak', () => {
    const now = new Date(2026, 9, 24, 12, 0, 0);
    const sessions = [
      focusSession('d24-cancelled', localTime(2026, 10, 24, 9), 600, {
        status: 'cancelled',
        completedAt: null,
      }),
      focusSession('d23', localTime(2026, 10, 23, 9)),
    ];

    expect(getCurrentStreak(sessions, now)).toBe(1);
  });
});
