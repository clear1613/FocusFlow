import type { TimerMode } from '../../types';
import { useI18n } from '../../hooks/useI18n';

const modes: TimerMode[] = ['focus', 'short_break', 'long_break'];

export function ModeTabs({
  mode,
  disabled,
  onChange,
}: {
  mode: TimerMode;
  disabled: boolean;
  onChange: (mode: TimerMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800"
      role="group"
      aria-label={t('timerMode')}
    >
      {modes.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={mode === item}
          disabled={disabled}
          onClick={() => onChange(item)}
          className={`min-h-11 rounded-xl px-2 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 sm:px-3 sm:text-sm dark:focus-visible:ring-white ${
            mode === item
              ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-700 dark:text-white'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {t(`mode.${item}`)}
        </button>
      ))}
    </div>
  );
}
