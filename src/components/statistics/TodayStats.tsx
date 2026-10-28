import { useMemo } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { useLocalDay } from '../../hooks/useLocalDay';
import { getTodayStats } from '../../services/statisticsService';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import { formatFocusDuration } from '../../utils/time';

/**
 * Today's progress as a sentence, not a dashboard.
 *
 * The four counters still exist in `getTodayStats`, but a person reads
 * "已专注 1 小时 40 分钟" faster than four equal-weight numbers, and the raw
 * counts survive as the secondary line underneath.
 */
export function TodayStats() {
  const { locale, t } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const tasks = useTaskStore((s) => s.tasks);

  const day = useLocalDay();
  const stats = useMemo(() => getTodayStats(sessions, tasks, new Date(day)), [sessions, tasks, day]);
  const hasFocusToday = stats.pomodoros > 0 || stats.focusMinutes > 0;

  return (
    <section
      className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      aria-labelledby="today-stats-heading"
    >
      <h2
        id="today-stats-heading"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400"
      >
        {t('today')}
      </h2>

      {hasFocusToday ? (
        <>
          <p className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
            {t('stats.focusedFor', {
              duration: formatFocusDuration(stats.focusMinutes, locale),
            })}
          </p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t('stats.breakdown', {
              pomodoros: stats.pomodoros,
              tasks: stats.completedTasks,
            })}
          </p>
          {stats.currentStreak > 1 ? (
            <p className="mt-1 text-sm text-neutral-400">
              {t('stats.streakDays', { days: stats.currentStreak })}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 text-lg font-medium leading-snug">{t('stats.emptyTitle')}</p>
          <p className="mt-1 text-sm text-neutral-400">{t('stats.emptyHint')}</p>
        </>
      )}
    </section>
  );
}
