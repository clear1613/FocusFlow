import { useMemo } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { useLocalDay } from '../../hooks/useLocalDay';
import { getTodayStats } from '../../services/statisticsService';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';

export function TodayStats() {
  const { t } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const tasks = useTaskStore((s) => s.tasks);

  const day = useLocalDay();
  const stats = useMemo(() => getTodayStats(sessions, tasks, new Date(day)), [sessions, tasks, day]);

  return (
    <section
      className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      aria-labelledby="today-stats-heading"
    >
      <div className="mb-4">
        <h2 id="today-stats-heading" className="text-lg font-semibold">{t('today')}</h2>
        <p className="text-sm text-neutral-400">
          {t('todayDescription')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('pomodoros')} value={stats.pomodoros} />
        <Stat label={t('focusMinutes')} value={stats.focusMinutes} />
        <Stat label={t('completedTasks')} value={stats.completedTasks} />
        <Stat label={t('streak')} value={stats.currentStreak} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3 text-center dark:bg-neutral-800/60">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-neutral-400">{label}</div>
    </div>
  );
}
