import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { assignTask, hasBoundSession } from '../../services/taskAssignment';
import { useTaskStore } from '../../stores/taskStore';
import { formatSeconds } from '../../utils/time';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { SwitchTaskDialog } from '../task/SwitchTaskDialog';
import { ModeTabs } from './ModeTabs';
import { TimerControls } from './TimerControls';

export function TimerCard() {
  const { t } = useI18n();
  const { timer, actions } = usePomodoroTimer();
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);

  const [confirmReset, setConfirmReset] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);

  const activeTask = tasks.find((task) => task.id === activeTaskId);
  const openTasks = tasks.filter((task) => task.status === 'todo');

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

  /**
   * Picking a task is the one place the timer and the task list meet, so the
   * "a session is already bound" check lives here too — not in the picker.
   */
  function pickTask(taskId: string) {
    setPickerOpen(false);
    if (taskId === activeTaskId) return;

    if (hasBoundSession()) {
      setPendingSwitchId(taskId);
      return;
    }

    assignTask(taskId);
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

        <div className="pb-8 pt-7 text-center sm:pb-9 sm:pt-8">
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

        <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800" aria-live="polite">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {t('timer.currentTask')}
          </div>

          {activeTask ? (
            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{activeTask.title}</div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {t('taskProgress', {
                    done: activeTask.completedPomodoros,
                    total: activeTask.estimatedPomodoros,
                  })}
                </div>
              </div>
              <Button variant="ghost" className="shrink-0" onClick={() => setPickerOpen(true)}>
                {t('timer.changeTask')}
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-neutral-500 dark:text-neutral-400">
                {openTasks.length === 0 ? t('timer.noTasks') : t('timer.chooseTask')}
              </p>
              {openTasks.length === 0 ? null : (
                <Button variant="secondary" className="shrink-0" onClick={() => setPickerOpen(true)}>
                  {t('timer.chooseTaskAction')}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <TimerControls
            mode={timer.mode}
            status={timer.status}
            onStart={actions.start}
            onPause={actions.pause}
            onReset={requestReset}
            onSkip={actions.skip}
          />
        </div>
      </section>

      <Modal
        open={pickerOpen}
        title={t('timer.pickTitle')}
        description={t('timer.pickDescription')}
        onClose={() => setPickerOpen(false)}
        size="md"
      >
        {openTasks.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('timer.noPickable')}</p>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => pickTask(task.id)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-left transition hover:border-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:hover:border-white dark:focus-visible:ring-white"
                >
                  <span className="block truncate font-medium">{task.title}</span>
                  <span className="mt-0.5 block text-xs text-neutral-400">
                    {t('taskProgress', {
                      done: task.completedPomodoros,
                      total: task.estimatedPomodoros,
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReset}
        title={t('resetTimerTitle')}
        description={t('resetTimerDescription')}
        confirmLabel={t('action.endRound')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          actions.reset();
        }}
      />

      <SwitchTaskDialog taskId={pendingSwitchId} onClose={() => setPendingSwitchId(null)} />
    </>
  );
}
