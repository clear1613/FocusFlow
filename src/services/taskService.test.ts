import { describe, expect, it } from 'vitest';
import type { FocusSession, Task } from '../types';
import {
  hasTaskHistory,
  removeTaskKeepingHistory,
  resolveTaskLabel,
  sanitizeTaskEdit,
  updateTaskDetails,
} from './taskService';

const task: Task = {
  id: 'task-1',
  title: 'Original task',
  estimatedPomodoros: 2,
  completedPomodoros: 1,
  status: 'todo',
  createdAt: 1,
  completedAt: null,
};

const session: FocusSession = {
  id: 'session-1',
  taskId: task.id,
  type: 'focus',
  status: 'completed',
  startedAt: 1,
  endedAt: 2,
  plannedDurationSeconds: 1500,
  actualDurationSeconds: 1500,
  completedAt: 2,
};

describe('taskService', () => {
  it('sanitizes title and estimated pomodoros', () => {
    expect(
      sanitizeTaskEdit({ title: '  README  ', estimatedPomodoros: 120 }),
    ).toEqual({ title: 'README', estimatedPomodoros: 99 });
  });

  it('updates task details without changing historical counters or status', () => {
    const [updated] = updateTaskDetails([task], task.id, {
      title: ' Updated ',
      estimatedPomodoros: 4,
    });

    expect(updated.title).toBe('Updated');
    expect(updated.estimatedPomodoros).toBe(4);
    expect(updated.completedPomodoros).toBe(1);
    expect(updated.status).toBe('todo');
  });

  it('detects task history from sessions', () => {
    expect(hasTaskHistory([session], task.id)).toBe(true);
    expect(hasTaskHistory([], task.id)).toBe(false);
  });

  it('deletes only the task and leaves session history independently intact', () => {
    expect(removeTaskKeepingHistory([task], task.id)).toEqual([]);
    expect(session.taskId).toBe(task.id);
  });

  it('resolves deleted and unassigned history labels safely', () => {
    expect(resolveTaskLabel([task], task.id)).toBe('Original task');
    expect(resolveTaskLabel([], task.id)).toBe('Deleted Task');
    expect(resolveTaskLabel([], null)).toBe('Unassigned');
  });
});
