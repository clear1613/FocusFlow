import type { FocusSession } from './session';

export type HistoryRange = 'today' | '7d' | '30d' | 'custom';
export type HistoryStatus = 'completed' | 'cancelled' | 'skipped';
export type HistoryTaskFilter = 'all' | 'unassigned' | 'deleted' | `task:${string}`;
export interface HistoryFilters {
  range: HistoryRange;
  from: string;
  to: string;
  task: HistoryTaskFilter;
  status: HistoryStatus | 'all';
}
export interface HistoryRecord extends Omit<FocusSession, 'status'> {
  status: HistoryStatus;
  at: number;
  dateKey: string;
  taskTitle: string | null;
}
export interface HistorySummary { completedCount: number; focusSeconds: number; focusMinutes: number }
export interface HistoryDay {
  dateKey: string;
  dayStart: number;
  records: HistoryRecord[];
  summary: HistorySummary;
}
export interface HistoryResult {
  error: 'invalidDate' | 'dateOrder' | null;
  from: string;
  to: string;
  records: HistoryRecord[];
  days: HistoryDay[];
  summary: HistorySummary;
}
