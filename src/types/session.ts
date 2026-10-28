import type { TimerMode } from './timer';

export type SessionStatus = 'running' | 'completed' | 'cancelled' | 'skipped';

export interface FocusSession {
  id: string;
  taskId: string | null;
  type: TimerMode;
  status: SessionStatus;
  startedAt: number;
  endedAt: number | null;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  completedAt: number | null;
}
