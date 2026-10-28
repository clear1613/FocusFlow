import { persistAppState } from './persistAppState';
import { useSessionStore } from '../stores/sessionStore';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';

/**
 * True when a Session is currently bound to the timer.
 *
 * Only then does switching the current task change historical meaning: the
 * running Session is re-pointed at the new task, so the user must confirm it.
 */
export function hasBoundSession(): boolean {
  const timer = useTimerStore.getState().timer;
  return (
    (timer.status === 'running' || timer.status === 'paused') &&
    timer.activeSessionId !== null
  );
}

/**
 * Make `taskId` the current task, re-binding the running Session if one exists.
 *
 * The Session keeps its own record; only its `taskId` changes, which is why the
 * previous task's completed Pomodoro count is not rewritten.
 */
export function assignTask(taskId: string): void {
  const timer = useTimerStore.getState().timer;

  if (timer.activeSessionId) {
    useSessionStore.getState().replace(
      useSessionStore.getState().sessions.map((session) =>
        session.id === timer.activeSessionId && session.status === 'running'
          ? { ...session, taskId }
          : session,
      ),
    );
  }

  useTaskStore.getState().setActiveTask(taskId);
  persistAppState();
}
