import { useMemo } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { useLocalDay } from '../../hooks/useLocalDay';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getLast7DaysFocusMinutes,
  getWeeklyFocusSummary,
} from '../../services/statisticsService';
import { useSessionStore } from '../../stores/sessionStore';

export function WeeklyChart() {
  const { locale, t } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const day = useLocalDay();
  const now = useMemo(() => new Date(day), [day]);

  const data = useMemo(
    () =>
      getLast7DaysFocusMinutes(sessions, now).map((item) => ({
        ...item,
        date: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(item.dayStart),
      })),
    [sessions, now, locale],
  );

  const summary = useMemo(() => getWeeklyFocusSummary(sessions, now), [sessions, now]);
  const weekdayOf = (dayStart: number) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dayStart);

  return (
    <section
      className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      aria-labelledby="weekly-heading"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="weekly-heading" className="text-lg font-semibold">
            {t('weekly')}
          </h2>
          <p className="text-sm text-neutral-400">{t('weeklyDescription')}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-semibold tabular-nums">{summary.totalMinutes}</div>
          <div className="text-xs text-neutral-400">{t('minutes')}</div>
        </div>
      </div>

      <div className="h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} />
            <YAxis
              width={30}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip formatter={(value) => [`${String(value)} ${t('minuteShort')}`, t('mode.focus')]} />
            <Bar dataKey="minutes" fill="currentColor" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* One rule-based sentence. Derived from the same array as the bars, so it
          can never contradict the chart above it. */}
      <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        {summary.bestDay === null
          ? t('weeklyEmpty')
          : summary.activeDays === 1
            ? t('weekly.summarySingle', {
                minutes: summary.totalMinutes,
                weekday: weekdayOf(summary.bestDay.dayStart),
              })
            : t('weekly.summaryBest', {
                minutes: summary.totalMinutes,
                weekday: weekdayOf(summary.bestDay.dayStart),
                dayMinutes: summary.bestDay.minutes,
              })}
      </p>

      <ul className="sr-only" aria-label={t('weeklyAccessible')}>
        {data.map((item) => (
          <li key={item.date}>
            {item.date}: {item.minutes} {t('minutes')}
          </li>
        ))}
      </ul>
    </section>
  );
}
