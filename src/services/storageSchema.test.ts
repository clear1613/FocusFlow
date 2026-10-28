import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import { validatePersistedAppData } from './storageSchema';

describe('validatePersistedAppData', () => {
  it('accepts valid current data', () => {
    expect(validatePersistedAppData(createDefaultAppData()).ok).toBe(true);
  });

  it('rejects an invalid task status', () => {
    const data = createDefaultAppData();
    data.tasks = [
      {
        id: 'task-1',
        title: 'README',
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        status: 'todo',
        createdAt: 1,
        completedAt: null,
      },
    ];
    const raw = JSON.parse(JSON.stringify(data));
    raw.tasks[0].status = 'unknown';

    const result = validatePersistedAppData(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('status');
  });

  it('rejects invalid settings ranges', () => {
    const data = createDefaultAppData();
    const raw = JSON.parse(JSON.stringify(data));
    raw.settings.focusMinutes = 0;

    expect(validatePersistedAppData(raw).ok).toBe(false);
  });

  it('rejects malformed session lifecycle fields', () => {
    const data = createDefaultAppData();
    const raw = JSON.parse(JSON.stringify(data));
    raw.sessions = [
      {
        id: 'session-1',
        taskId: null,
        type: 'focus',
        status: 'completed',
        startedAt: 10,
        endedAt: null,
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1500,
        completedAt: null,
      },
    ];

    expect(validatePersistedAppData(raw).ok).toBe(false);
  });

  it('rejects activeTaskId pointing to a missing task', () => {
    const data = createDefaultAppData();
    const raw = JSON.parse(JSON.stringify(data));
    raw.activeTaskId = 'missing';

    expect(validatePersistedAppData(raw).ok).toBe(false);
  });
});
