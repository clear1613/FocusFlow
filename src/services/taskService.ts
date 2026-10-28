import type { FocusSession, Task } from '../types';

export interface TaskEditInput {
  title: string;
  estimatedPomodoros: number;
}

export function sanitizeTaskEdit(input: TaskEditInput): TaskEditInput {
  return {
    title: input.title.trim().slice(0, 80),
    estimatedPomodoros: Math.min(99, Math.max(1, Math.trunc(input.estimatedPomodoros) || 1)),
  };
}

export function hasTaskHistory(
  sessions: FocusSession[],
  taskId: string,
): boolean {
  return sessions.some((session) => session.taskId === taskId);
}

export function resolveTaskLabel(
  tasks: Task[],
  taskId: string | null,
): string {
  if (taskId === null) return 'Unassigned';
  return tasks.find((task) => task.id === taskId)?.title ?? 'Deleted Task';
}

export function updateTaskDetails(
  tasks: Task[],
  taskId: string,
  input: TaskEditInput,
): Task[] {
  const sanitized = sanitizeTaskEdit(input);
  if (!sanitized.title) return tasks;

  return tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          title: sanitized.title,
          estimatedPomodoros: sanitized.estimatedPomodoros,
        }
      : task,
  );
}

export function removeTaskKeepingHistory(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) => task.id !== taskId);
}
