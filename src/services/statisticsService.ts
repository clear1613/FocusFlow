import {
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
  subDays,
} from 'date-fns';
import type { FocusSession, Task } from '../types';

export interface TodayStats {
  pomodoros: number;
  focusMinutes: number;
  completedTasks: number;
  currentStreak: number;
}

export interface DailyFocusMinutes {
  date: string;
  dayStart: number;
  minutes: number;
}

export function isCompletedFocusSession(
  session: FocusSession,
): session is FocusSession & { completedAt: number } {
  return (
    session.type === 'focus' &&
    session.status === 'completed' &&
    session.completedAt !== null
  );
}

function sumFocusSeconds(sessions: FocusSession[]): number {
  return sessions.reduce(
    (sum, session) => sum + Math.max(0, session.actualDurationSeconds),
    0,
  );
}

function secondsToRoundedMinutes(seconds: number): number {
  return Math.round(Math.max(0, seconds) / 60);
}

export function getTodayStats(
  sessions: FocusSession[],
  tasks: Task[],
  now = new Date(),
): TodayStats {
  const todaySessions = sessions.filter(
    (session) =>
      isCompletedFocusSession(session) &&
      isSameDay(new Date(session.completedAt), now),
  );

  return {
    pomodoros: todaySessions.length,
    focusMinutes: secondsToRoundedMinutes(sumFocusSeconds(todaySessions)),
    completedTasks: tasks.filter(
      (task) =>
        task.completedAt !== null && isSameDay(new Date(task.completedAt), now),
    ).length,
    currentStreak: getCurrentStreak(sessions, now),
  };
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
}

/**
 * Rule-based conclusion for the weekly chart.
 *
 * The sentence the UI renders is derived from the same array the bars are drawn
 * from, so it cannot disagree with the chart. Ties resolve to the earlier day,
 * which keeps the text stable across re-renders.
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

  return {
    totalMinutes,
    activeDays,
    bestDay: best ? { dayStart: best.dayStart, minutes: best.minutes } : null,
  };
}

/**
 * Current streak is calculated from completed Focus Sessions only.
 *
 * Today is treated as a grace day: if no Focus Session has completed today yet,
 * the streak may continue from yesterday. Once a full inactive day exists
 * between `now` and the latest active day, the streak is zero/broken.
 */
export function getCurrentStreak(
  sessions: FocusSession[],
  now = new Date(),
): number {
  const activeDayStarts = new Set(
    sessions
      .filter(isCompletedFocusSession)
      .map((session) => startOfDay(new Date(session.completedAt)).getTime()),
  );

  let cursor = startOfDay(now);

  // Do not punish the user for not having focused yet today. This preserves
  // yesterday's streak until today has fully elapsed.
  if (!activeDayStarts.has(cursor.getTime())) {
    cursor = startOfDay(subDays(cursor, 1));
  }

  let streak = 0;

  while (activeDayStarts.has(cursor.getTime())) {
    streak += 1;
    cursor = startOfDay(subDays(cursor, 1));
  }

  return streak;
}
