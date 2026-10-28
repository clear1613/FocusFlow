import type { AppSettings, TimerMode } from '../types';

export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
