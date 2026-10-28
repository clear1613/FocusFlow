import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { formatSeconds } from '../../utils/time';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ModeTabs } from './ModeTabs';
import { TimerControls } from './TimerControls';

export function TimerCard() {
  const { t } = useI18n();
  const { timer, actions } = usePomodoroTimer();
  const [confirmReset, setConfirmReset] = useState(false);

  const progress =
    timer.plannedDurationSeconds <= 0
      ? 0
      : 1 - timer.remainingSeconds / timer.plannedDurationSeconds;
  const progressPercent = Math.round(Math.min(100, Math.max(0, progress * 100)));

  function requestReset() {
    if (timer.status === 'running' || timer.status === 'paused') {
      setConfirmReset(true);
      return;
    }
    actions.reset();
  }

  return (
    <>
      <section
        className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8"
        aria-labelledby="timer-heading"
      >
        <h2 id="timer-heading" className="sr-only">
          {t('timer')}
        </h2>

        <ModeTabs
          mode={timer.mode}
          disabled={timer.status !== 'idle'}
          onChange={actions.changeMode}
        />

        <div className="py-9 text-center sm:py-10">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-neutral-400">
            {t(`mode.${timer.mode}`)}
          </div>
          <div
            className="font-mono text-6xl font-semibold tracking-tight sm:text-8xl"
            aria-label={t('remaining', { time: formatSeconds(timer.remainingSeconds) })}
          >
            {formatSeconds(timer.remainingSeconds)}
          </div>
          <div
            className="mx-auto mt-7 h-2 max-w-md overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
            role="progressbar"
            aria-label={t('timerProgress')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-full bg-neutral-900 transition-[width] dark:bg-white"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <TimerControls
          status={timer.status}
          onStart={actions.start}
          onPause={actions.pause}
          onReset={requestReset}
          onSkip={actions.skip}
        />
      </section>

      <ConfirmDialog
        open={confirmReset}
        title={t('resetTimerTitle')}
        description={t('resetTimerDescription')}
        confirmLabel={t('reset')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          actions.reset();
        }}
      />
    </>
  );
}
