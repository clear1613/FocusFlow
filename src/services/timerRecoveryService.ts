import type { PersistedAppData, TimerState } from '../types';
import { getRemainingSeconds } from '../utils/time';
import { completeSessionOnce, terminateSessionOnce } from './sessionService';
import {
  createIdleTimerForMode,
  getElapsedActiveSeconds,
  getNextModeAfterCompletion,
} from './timerService';

export interface TimerRecoveryResult {
  data: PersistedAppData;
  changed: boolean;
  completedExpiredSession: boolean;
}

function idleTimer(timer: TimerState, data: PersistedAppData): TimerState {
  return createIdleTimerForMode(
    timer,
    timer.mode,
    data.settings,
    timer.completedFocusCountInCycle,
  );
}

function normalizeToSafeIdle(
  data: PersistedAppData,
  now: number,
): TimerRecoveryResult {
  const timer = data.timer;

  if (timer.activeSessionId) {
    const termination = terminateSessionOnce(
      data.sessions,
      timer.activeSessionId,
      'cancelled',
      now,
      getElapsedActiveSeconds(timer, now),
    );
    if (termination.terminated) data.sessions = termination.sessions;
  }

  data.timer = idleTimer(timer, data);
  return { data, changed: true, completedExpiredSession: false };
}

export function recoverPersistedTimer(
  input: PersistedAppData,
  now: number,
): TimerRecoveryResult {
  const data: PersistedAppData = {
    ...input,
    tasks: [...input.tasks],
    sessions: [...input.sessions],
    timer: { ...input.timer },
    settings: { ...input.settings },
  };

  const timer = data.timer;

  if (timer.status === 'idle') {
    if (
      timer.endAt !== null ||
      timer.activeSessionId !== null ||
      timer.startedAt !== null
    ) {
      return normalizeToSafeIdle(data, now);
    }
    return { data, changed: false, completedExpiredSession: false };
  }

  if (timer.status === 'paused') {
    const session = timer.activeSessionId
      ? data.sessions.find((item) => item.id === timer.activeSessionId)
      : undefined;

    if (
      !timer.activeSessionId ||
      timer.remainingSeconds <= 0 ||
      timer.endAt !== null ||
      !session ||
      session.status !== 'running'
    ) {
      return normalizeToSafeIdle(data, now);
    }

    return { data, changed: false, completedExpiredSession: false };
  }

  if (timer.status === 'completed') {
    // Completed is transient in V0.2. If an older/crashed state persists it,
    // normalize rather than replaying completion side effects.
    return normalizeToSafeIdle(data, now);
  }

  // Running invariant: both endAt and activeSessionId must exist and point to
  // the still-running session.
  if (timer.endAt === null || timer.activeSessionId === null) {
    return normalizeToSafeIdle(data, now);
  }

  const activeSession = data.sessions.find(
    (session) => session.id === timer.activeSessionId,
  );

  if (!activeSession || activeSession.status !== 'running') {
    return normalizeToSafeIdle(data, now);
  }

  const remainingSeconds = getRemainingSeconds(timer.endAt, now);

  if (remainingSeconds > 0) {
    if (remainingSeconds !== timer.remainingSeconds) {
      data.timer.remainingSeconds = remainingSeconds;
      return { data, changed: true, completedExpiredSession: false };
    }

    return { data, changed: false, completedExpiredSession: false };
  }

  const completion = completeSessionOnce(
    data.sessions,
    data.tasks,
    timer.activeSessionId,
    timer.endAt,
  );

  if (!completion.completed) {
    return normalizeToSafeIdle(data, now);
  }

  data.sessions = completion.sessions;
  data.tasks = completion.tasks;

  const transition = getNextModeAfterCompletion(
    timer.mode,
    timer.completedFocusCountInCycle,
    data.settings.longBreakInterval,
  );

  data.timer = createIdleTimerForMode(
    timer,
    transition.mode,
    data.settings,
    transition.completedFocusCountInCycle,
  );

  return { data, changed: true, completedExpiredSession: true };
}
