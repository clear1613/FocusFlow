import { useCallback, useEffect } from 'react';
import { useI18n } from './useI18n';
import { getText } from '../services/i18n';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { persistAppState } from '../services/persistAppState';
import {
  completeSessionOnce,
  terminateSessionOnce,
} from '../services/sessionService';
import {
  createIdleTimerForMode,
  getElapsedActiveSeconds,
  getNextModeAfterCompletion,
  getNextModeAfterSkip,
} from '../services/timerService';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { showToast } from '../stores/toastStore';
import { useTimerStore } from '../stores/timerStore';
import { canWriteAppData } from '../stores/tabStore';
import type { FocusSession, TimerMode } from '../types';
import { generateId } from '../utils/id';
import {
  getModeDurationSeconds,
  getRemainingSeconds,
} from '../utils/time';

export function usePomodoroTimer() {
  const { t } = useI18n();
  const timer = useTimerStore((s) => s.timer);
  const settings = useSettingsStore((s) => s.settings);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);

  const start = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;

    if (current.status !== 'idle' && current.status !== 'paused') return;

    const now = Date.now();
    const currentSettings = useSettingsStore.getState().settings;

    if (current.status === 'paused') {
      const session = current.activeSessionId
        ? useSessionStore
            .getState()
            .sessions.find((item) => item.id === current.activeSessionId)
        : undefined;

      if (!session || session.status !== 'running' || current.activeSessionId === null) {
        useTimerStore
          .getState()
          .hydrate(
            createIdleTimerForMode(
              current,
              current.mode,
              currentSettings,
              current.completedFocusCountInCycle,
            ),
          );
        persistAppState();
        return;
      }

      useTimerStore.getState().patch({
        status: 'running',
        endAt: now + current.remainingSeconds * 1000,
      });
      persistAppState();
      return;
    }

    const durationSeconds = getModeDurationSeconds(current.mode, currentSettings);
    const sessionId = generateId('session');
    const session: FocusSession = {
      id: sessionId,
      taskId: useTaskStore.getState().activeTaskId,
      type: current.mode,
      status: 'running',
      startedAt: now,
      endedAt: null,
      plannedDurationSeconds: durationSeconds,
      actualDurationSeconds: 0,
      completedAt: null,
    };

    useSessionStore.getState().append(session);
    useTimerStore.getState().patch({
      status: 'running',
      remainingSeconds: durationSeconds,
      plannedDurationSeconds: durationSeconds,
      startedAt: now,
      endAt: now + durationSeconds * 1000,
      activeSessionId: sessionId,
    });
    persistAppState();
  }, []);

  const complete = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    if (current.status !== 'running' || !current.activeSessionId) return;

    const now = Date.now();
    const sessionResult = completeSessionOnce(
      useSessionStore.getState().sessions,
      useTaskStore.getState().tasks,
      current.activeSessionId,
      current.endAt ?? now,
    );

    // Late interval/visibility/restore callback. No business side effect repeats.
    if (!sessionResult.completed) return;

    useSessionStore.getState().replace(sessionResult.sessions);
    useTaskStore.getState().replaceTasks(sessionResult.tasks);

    const currentSettings = useSettingsStore.getState().settings;
    const transition = getNextModeAfterCompletion(
      current.mode,
      current.completedFocusCountInCycle,
      currentSettings.longBreakInterval,
    );

    const nextTimer = createIdleTimerForMode(
      current,
      transition.mode,
      currentSettings,
      transition.completedFocusCountInCycle,
    );

    // Persist the final business state once. There is no persisted transient
    // `completed + activeSessionId` window that could be replayed after a crash.
    useTimerStore.getState().hydrate(nextTimer);
    persistAppState();

    // Non-critical side effects happen only after data is safely committed.
    if (currentSettings.soundEnabled) {
      if (current.mode === 'focus') audioService.focusComplete();
      else audioService.breakComplete();
    }

    const completionMessage =
      current.mode === 'focus'
        ? getText('focusCompleteDescription')
        : getText('breakCompleteDescription');

    showToast({
      title: getText(current.mode === 'focus' ? 'focusComplete' : 'breakComplete'),
      description: completionMessage,
      tone: 'success',
    });

    if (currentSettings.notificationEnabled) {
      notificationService.notify('FocusFlow', completionMessage);
    }

    const shouldAutoStart =
      transition.mode === 'focus'
        ? currentSettings.autoStartFocus
        : currentSettings.autoStartBreak;

    if (shouldAutoStart) queueMicrotask(start);
  }, [start]);

  const pause = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    if (current.status !== 'running' || current.endAt === null) return;

    const remainingSeconds = getRemainingSeconds(current.endAt, Date.now());
    if (remainingSeconds <= 0) {
      complete();
      return;
    }

    useTimerStore.getState().patch({
      status: 'paused',
      remainingSeconds,
      endAt: null,
    });
    persistAppState();
  }, [complete]);

  const reset = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    const now = Date.now();

    // Timestamp is the source of truth. If the timer has already expired, a
    // late Reset click must not rewrite a logically completed focus as cancelled.
    if (
      current.status === 'running' &&
      current.endAt !== null &&
      getRemainingSeconds(current.endAt, now) <= 0
    ) {
      complete();
      return;
    }

    if (current.activeSessionId) {
      const termination = terminateSessionOnce(
        useSessionStore.getState().sessions,
        current.activeSessionId,
        'cancelled',
        now,
        getElapsedActiveSeconds(current, now),
      );
      if (termination.terminated) {
        useSessionStore.getState().replace(termination.sessions);
      }
    }

    useTimerStore
      .getState()
      .hydrate(
        createIdleTimerForMode(
          current,
          current.mode,
          useSettingsStore.getState().settings,
          current.completedFocusCountInCycle,
        ),
      );
    persistAppState();
  }, [complete]);

  const skip = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    const now = Date.now();

    if (
      current.status === 'running' &&
      current.endAt !== null &&
      getRemainingSeconds(current.endAt, now) <= 0
    ) {
      complete();
      return;
    }

    if (current.activeSessionId) {
      const termination = terminateSessionOnce(
        useSessionStore.getState().sessions,
        current.activeSessionId,
        'skipped',
        now,
        getElapsedActiveSeconds(current, now),
      );
      if (termination.terminated) {
        useSessionStore.getState().replace(termination.sessions);
      }
    }

    const nextMode = getNextModeAfterSkip(current.mode);
    useTimerStore
      .getState()
      .hydrate(
        createIdleTimerForMode(
          current,
          nextMode,
          useSettingsStore.getState().settings,
          current.completedFocusCountInCycle,
        ),
      );
    persistAppState();
  }, [complete]);

  const syncNow = useCallback(() => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    if (current.status !== 'running' || current.endAt === null) return;

    const remainingSeconds = getRemainingSeconds(current.endAt, Date.now());
    if (remainingSeconds <= 0) {
      complete();
      return;
    }

    // Runtime-only UI state: do not write LocalStorage every second.
    useTimerStore.getState().patch({ remainingSeconds });
  }, [complete]);

  const changeMode = useCallback((mode: TimerMode) => {
    if (!canWriteAppData()) return;
    const current = useTimerStore.getState().timer;
    if (current.status !== 'idle') return;

    useTimerStore
      .getState()
      .hydrate(
        createIdleTimerForMode(
          current,
          mode,
          useSettingsStore.getState().settings,
          current.completedFocusCountInCycle,
        ),
      );
    persistAppState();
  }, []);

  useEffect(() => {
    if (timer.status !== 'running') return;
    syncNow();

    const interval = window.setInterval(syncNow, 1000);
    return () => window.clearInterval(interval);
  }, [timer.status, timer.endAt, syncNow]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [syncNow]);

  useEffect(() => {
    if (timer.status === 'running') {
      const minutes = String(Math.floor(timer.remainingSeconds / 60)).padStart(2, '0');
      const seconds = String(timer.remainingSeconds % 60).padStart(2, '0');
      const label = timer.mode === 'focus' ? '' : ` · ${t(`mode.${timer.mode}`)}`;
      document.title = `${minutes}:${seconds}${label} · FocusFlow`;
    } else {
      document.title = 'FocusFlow';
    }
  }, [timer.mode, timer.remainingSeconds, timer.status, t]);

  return {
    timer,
    settings,
    activeTaskId,
    actions: {
      start,
      pause,
      reset,
      skip,
      changeMode,
      syncNow,
    },
  };
}
