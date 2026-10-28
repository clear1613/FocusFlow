import type { FocusSession, SessionStatus, Task } from '../types';

export function completeSessionOnce(
  sessions: FocusSession[],
  tasks: Task[],
  sessionId: string,
  now: number,
): { sessions: FocusSession[]; tasks: Task[]; completed: boolean } {
  const target = sessions.find((session) => session.id === sessionId);

  // Only a running session can complete. This protects cancelled/skipped and
  // already-completed sessions from late timer/restore callbacks.
  if (!target || target.status !== 'running') {
    return { sessions, tasks, completed: false };
  }

  const sessionsNext = sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          status: 'completed' as const,
          endedAt: now,
          completedAt: now,
          // Natural timeout means the active countdown itself reached zero.
          // Pause wall-clock time must not inflate actual focus duration.
          actualDurationSeconds: session.plannedDurationSeconds,
        }
      : session,
  );

  const tasksNext =
    target.type === 'focus' && target.taskId
      ? tasks.map((task) =>
          task.id === target.taskId
            ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
            : task,
        )
      : tasks;

  return { sessions: sessionsNext, tasks: tasksNext, completed: true };
}

export function terminateSessionOnce(
  sessions: FocusSession[],
  sessionId: string,
  status: Extract<SessionStatus, 'cancelled' | 'skipped'>,
  now: number,
  actualDurationSeconds: number,
): { sessions: FocusSession[]; terminated: boolean } {
  const target = sessions.find((session) => session.id === sessionId);

  if (!target || target.status !== 'running') {
    return { sessions, terminated: false };
  }

  return {
    sessions: sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status,
            endedAt: now,
            completedAt: null,
            actualDurationSeconds: Math.max(
              0,
              Math.min(actualDurationSeconds, session.plannedDurationSeconds),
            ),
          }
        : session,
    ),
    terminated: true,
  };
}
