import type { TimerStatus } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Button } from '../common/Button';

export function TimerControls({
  status,
  onStart,
  onPause,
  onReset,
  onSkip,
}: {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {status === 'running' ? (
        <Button onClick={onPause}>{t('pause')}</Button>
      ) : (
        <Button onClick={onStart}>{t(status === 'paused' ? 'resume' : 'start')}</Button>
      )}
      <Button variant="secondary" onClick={onReset}>
        {t('reset')}
      </Button>
      <Button variant="ghost" onClick={onSkip}>
        {t('skip')}
      </Button>
    </div>
  );
}
