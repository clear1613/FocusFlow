import { eachDayOfInterval, format, isSameDay, startOfDay, subDays } from 'date-fns';
import type { FocusSession } from '../types';
import { isCompletedFocusSession, secondsToRoundedMinutes } from './statisticsService';

export interface DailyFocusMinutes {
  date: string;
  dayStart: number;
  minutes: number;
}

export function getLast7DaysFocusMinutes(
  sessions: FocusSession[],
  now = new Date(),
): DailyFocusMinutes[] {
  const days = eachDayOfInterval({
    start: startOfDay(subDays(now, 6)),
    end: startOfDay(now),
  });

  const completedSessions = sessions.filter(isCompletedFocusSession);

  return days.map((day) => {
    const seconds = completedSessions
      .filter((session) => isSameDay(new Date(session.completedAt), day))
      .reduce(
        (sum, session) => sum + Math.max(0, session.actualDurationSeconds),
        0,
      );

    return {
      date: format(day, 'EEE'),
      dayStart: day.getTime(),
      minutes: secondsToRoundedMinutes(seconds),
    };
  });
}

export interface WeeklyFocusSummary {
  totalMinutes: number;
  activeDays: number;
  bestDay: { dayStart: number; minutes: number } | null;
  /**
   * All days sharing the maximum minutes. Empty when nothing was recorded.
   * More than one entry means the "strongest day" claim would be misleading,
   * so the UI switches to a tie-aware sentence instead.
   */
  tiedDayStarts: number[];
}

/**
 * Rule-based conclusion for the weekly chart.
 *
 * The sentence the UI renders is derived from the same array the bars are drawn
 * from, so it cannot disagree with the chart. The best day is still the earlier
 * one on a tie (stable across re-renders), but the tie itself is reported so
 * the text never singles out one day when several are equal.
 */
export function getWeeklyFocusSummary(
  sessions: FocusSession[],
  now = new Date(),
): WeeklyFocusSummary {
  const days = getLast7DaysFocusMinutes(sessions, now);
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = days.filter((day) => day.minutes > 0).length;

  let best: DailyFocusMinutes | null = null;
  for (const day of days) {
    if (day.minutes > (best?.minutes ?? 0)) best = day;
  }

  const tiedDayStarts = best
    ? days.filter((day) => day.minutes === best.minutes).map((day) => day.dayStart)
    : [];

  return {
    totalMinutes,
    activeDays,
    bestDay: best ? { dayStart: best.dayStart, minutes: best.minutes } : null,
    tiedDayStarts,
  };
}
