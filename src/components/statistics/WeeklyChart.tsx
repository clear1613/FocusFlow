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
import { getLast7DaysFocusMinutes } from '../../services/statisticsService';
import { useSessionStore } from '../../stores/sessionStore';

export function WeeklyChart() {
  const { locale, t } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const day = useLocalDay();
  const data = useMemo(() => getLast7DaysFocusMinutes(sessions, new Date(day)).map((item) => ({
    ...item,
    date: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(item.dayStart),
  })), [sessions, day, locale]);
  const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
  const hasFocusData = totalMinutes > 0;

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
        <div className="text-right">
          <div className="text-xl font-semibold">{totalMinutes}</div>
          <div className="text-xs text-neutral-400">{t('minutes')}</div>
        </div>
      </div>

      {!hasFocusData ? (
        <p className="mb-3 text-sm text-neutral-400">
          {t('weeklyEmpty')}
        </p>
      ) : null}

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
