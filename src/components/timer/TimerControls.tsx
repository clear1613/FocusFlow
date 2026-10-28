import type { TimerMode, TimerStatus } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Button } from '../common/Button';

/**
 * Actions are labelled by what the user is about to do, not by the internal
 * status name. `mode + status` is the only input needed: the same button is
 * "Start focus" in a focus idle state and "Start break" in a break idle state.
 */
export function TimerControls({
  mode,
  status,
  onStart,
  onPause,
  onReset,
  onSkip,
}: {
  mode: TimerMode;
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const isBreak = mode !== 'focus';

  const primaryLabel =
    status === 'running'
      ? t('action.pauseFocus')
      : status === 'paused'
        ? t(isBreak ? 'action.resumeBreak' : 'action.resumeFocus')
        : t(isBreak ? 'action.startBreak' : 'action.startFocus');

  // Ending or skipping only makes sense once a round exists: an idle focus has
  // nothing to end, so the row stays a single clear action.
  const showEndRound = status !== 'idle';
  const showSkip = isBreak || status !== 'idle';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        onClick={status === 'running' ? onPause : onStart}
        className="min-w-[9.5rem] sm:min-w-[11rem]"
      >
        {primaryLabel}
      </Button>
      {showEndRound ? (
        <Button variant="secondary" onClick={onReset}>
          {t('action.endRound')}
        </Button>
      ) : null}
      {showSkip ? (
        <Button variant="ghost" onClick={onSkip}>
          {t(isBreak ? 'action.skipBreak' : 'action.skipRound')}
        </Button>
      ) : null}
    </div>
  );
}
