import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import type { FocusSession, PersistedAppData, Task } from '../types';
import { recoverPersistedTimer } from './timerRecoveryService';

function buildRunningData({
  now = 1_000_000,
  remainingMs = 60_000,
  cycle = 0,
}: {
  now?: number;
  remainingMs?: number;
  cycle?: number;
} = {}): { data: PersistedAppData; now: number } {
  const data = createDefaultAppData();
  const task: Task = {
    id: 'task-1',
    title: 'README',
    estimatedPomodoros: 4,
    completedPomodoros: 0,
    status: 'todo',
    createdAt: 0,
    completedAt: null,
  };
  const session: FocusSession = {
    id: 'session-1',
    taskId: task.id,
    type: 'focus',
    status: 'running',
    startedAt: now - (25 * 60 * 1000 - Math.max(remainingMs, 0)),
    endedAt: null,
    plannedDurationSeconds: 25 * 60,
    actualDurationSeconds: 0,
    completedAt: null,
  };

  data.tasks = [task];
  data.sessions = [session];
  data.activeTaskId = task.id;
  data.timer = {
    ...data.timer,
    status: 'running',
    remainingSeconds: 999,
    plannedDurationSeconds: 25 * 60,
    startedAt: session.startedAt,
    endAt: now + remainingMs,
    activeSessionId: session.id,
    completedFocusCountInCycle: cycle,
  };

  return { data, now };
}

describe('recoverPersistedTimer', () => {
  it('attributes an overdue session to its deadline rather than the later reopen day', () => {
    const reopenedAt = new Date(2026, 9, 25, 8).getTime();
    const deadline = new Date(2026, 9, 24, 23, 55).getTime();
    const { data } = buildRunningData({ now: reopenedAt });
    data.sessions[0].startedAt = deadline - 1_500_000;
    data.timer.startedAt = data.sessions[0].startedAt;
    data.timer.endAt = deadline;

    const result = recoverPersistedTimer(data, reopenedAt);

    expect(result.data.sessions[0].completedAt).toBe(deadline);
    expect(result.data.sessions[0].endedAt).toBe(deadline);
    expect(result.data.tasks[0].completedPomodoros).toBe(1);
  });

  it('recalculates a still-running timer from endAt', () => {
    const { data, now } = buildRunningData({ remainingMs: 120_000 });
    const result = recoverPersistedTimer(data, now);

    expect(result.completedExpiredSession).toBe(false);
    expect(result.data.timer.status).toBe('running');
    expect(result.data.timer.remainingSeconds).toBe(120);
    expect(result.data.sessions[0].status).toBe('running');
  });

  it('completes an expired focus once and moves to short break', () => {
    const { data, now } = buildRunningData({ remainingMs: -1 });
    const first = recoverPersistedTimer(data, now);
    const second = recoverPersistedTimer(first.data, now + 1000);

    expect(first.completedExpiredSession).toBe(true);
    expect(first.data.sessions[0].status).toBe('completed');
    expect(first.data.tasks[0].completedPomodoros).toBe(1);
    expect(first.data.timer.mode).toBe('short_break');
    expect(first.data.timer.status).toBe('idle');
    expect(first.data.timer.completedFocusCountInCycle).toBe(1);

    expect(second.completedExpiredSession).toBe(false);
    expect(second.data.tasks[0].completedPomodoros).toBe(1);
  });

  it('moves the fourth expired focus to long break and resets cycle', () => {
    const { data, now } = buildRunningData({ remainingMs: -1, cycle: 3 });
    const result = recoverPersistedTimer(data, now);

    expect(result.data.timer.mode).toBe('long_break');
    expect(result.data.timer.completedFocusCountInCycle).toBe(0);
    expect(result.data.timer.remainingSeconds).toBe(15 * 60);
  });

  it('keeps a valid paused timer paused', () => {
    const { data, now } = buildRunningData();
    data.timer.status = 'paused';
    data.timer.endAt = null;
    data.timer.remainingSeconds = 900;

    const result = recoverPersistedTimer(data, now);
    expect(result.changed).toBe(false);
    expect(result.data.timer.status).toBe('paused');
    expect(result.data.timer.remainingSeconds).toBe(900);
  });

  it('normalizes invalid running state without fabricating completion', () => {
    const { data, now } = buildRunningData();
    data.timer.endAt = null;

    const result = recoverPersistedTimer(data, now);
    expect(result.data.timer.status).toBe('idle');
    expect(result.data.timer.activeSessionId).toBeNull();
    expect(result.data.tasks[0].completedPomodoros).toBe(0);
    expect(result.data.sessions[0].status).toBe('cancelled');
  });
});
