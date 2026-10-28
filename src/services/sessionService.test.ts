import { describe, expect, it } from 'vitest';
import type { FocusSession, Task } from '../types';
import { completeSessionOnce, terminateSessionOnce } from './sessionService';

function task(): Task {
  return {
    id: 'task-1',
    title: 'README',
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    status: 'todo',
    createdAt: 0,
    completedAt: null,
  };
}

function runningSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 'session-1',
    taskId: 'task-1',
    type: 'focus',
    status: 'running',
    startedAt: 0,
    endedAt: null,
    plannedDurationSeconds: 25 * 60,
    actualDurationSeconds: 0,
    completedAt: null,
    ...overrides,
  };
}

describe('completeSessionOnce', () => {
  it('completes a running focus exactly once and increments the task once', () => {
    const first = completeSessionOnce(
      [runningSession()],
      [task()],
      'session-1',
      40 * 60 * 1000,
    );
    const second = completeSessionOnce(
      first.sessions,
      first.tasks,
      'session-1',
      40 * 60 * 1000 + 1000,
    );

    expect(first.completed).toBe(true);
    expect(first.sessions[0].actualDurationSeconds).toBe(25 * 60);
    expect(first.tasks[0].completedPomodoros).toBe(1);
    expect(second.completed).toBe(false);
    expect(second.tasks[0].completedPomodoros).toBe(1);
  });

  it('does not resurrect a cancelled or skipped session', () => {
    for (const status of ['cancelled', 'skipped'] as const) {
      const result = completeSessionOnce(
        [runningSession({ status })],
        [task()],
        'session-1',
        2000,
      );
      expect(result.completed).toBe(false);
      expect(result.tasks[0].completedPomodoros).toBe(0);
    }
  });
});

describe('terminateSessionOnce', () => {
  it('records active elapsed time and is idempotent', () => {
    const first = terminateSessionOnce(
      [runningSession()],
      'session-1',
      'cancelled',
      10_000,
      45,
    );
    const second = terminateSessionOnce(
      first.sessions,
      'session-1',
      'cancelled',
      20_000,
      90,
    );

    expect(first.terminated).toBe(true);
    expect(first.sessions[0].status).toBe('cancelled');
    expect(first.sessions[0].actualDurationSeconds).toBe(45);
    expect(second.terminated).toBe(false);
    expect(second.sessions[0].actualDurationSeconds).toBe(45);
  });
});
