import type { AppLocale, AppSettings, TimerMode } from '../types';

export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Render a focus duration the way a person would say it.
 *
 * Counters show "100"; this shows "1 小时 40 分钟" / "1 h 40 min", which is what
 * the summary sentence needs. Minutes are already rounded by the statistics
 * service, so this function only splits them into hours and minutes.
 */
export function formatFocusDuration(totalMinutes: number, locale: AppLocale): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (locale === 'en') {
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }

  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分钟`;
}

export function getRemainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function getModeDurationSeconds(
  mode: TimerMode,
  settings: AppSettings,
): number {
  if (mode === 'short_break') return settings.shortBreakMinutes * 60;
  if (mode === 'long_break') return settings.longBreakMinutes * 60;
  return settings.focusMinutes * 60;
}

export function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}
