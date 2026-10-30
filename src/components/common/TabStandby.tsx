import { useEffect, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import type { TabRole } from '../../stores/tabStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTimerStore } from '../../stores/timerStore';
import { formatSeconds, getRemainingSeconds } from '../../utils/time';
import { TodayStats } from '../statistics/TodayStats';

export function TabStandby({ role }: { role: Exclude<TabRole, 'writer'> }) {
  useTheme();
  const { locale, t } = useI18n();
  const timer = useTimerStore(state => state.timer);
  const { tasks, activeTaskId } = useTaskStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `FocusFlow · ${t('tabs.readOnly')}`;
  }, [locale, t]);
  const remaining = timer.status === 'running' && timer.endAt !== null
    ? getRemainingSeconds(timer.endAt, now) : timer.remainingSeconds;
  const title = tasks.find(task => task.id === activeTaskId)?.title;

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-4 py-8 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">FocusFlow</h1>
          <span className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">{t('tabs.readOnly')}</span>
        </header>
        <section className="mb-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="tab-status">
          <h2 id="tab-status" className="text-lg font-semibold">{t(role === 'unsupported' ? 'tabs.unsupported' : role === 'checking' || role === 'initializing' ? 'tabs.checking' : 'tabs.reader')}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{t(role === 'unsupported' ? 'tabs.unsupportedHint' : 'tabs.readerHint')}</p>
        </section>
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900" aria-label={t('timer')}>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{t(`mode.${timer.mode}`)}</p>
            <p className="my-4 font-mono text-5xl font-semibold tabular-nums">{formatSeconds(remaining)}</p>
            <p className="break-words text-sm leading-6 text-neutral-600 dark:text-neutral-300">{title ?? t('noActiveTask')}</p>
          </section>
          <TodayStats />
        </div>
        <p className="mt-6 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{t('tabs.snapshotHint')}</p>
      </div>
    </main>
  );
}
