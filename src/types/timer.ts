export type TimerMode = 'focus' | 'short_break' | 'long_break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  plannedDurationSeconds: number;
  startedAt: number | null;
  endAt: number | null;
  activeSessionId: string | null;
  completedFocusCountInCycle: number;
}
