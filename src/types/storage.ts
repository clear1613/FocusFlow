import type { FocusSession } from './session';
import type { AppSettings } from './settings';
import type { Task } from './task';
import type { TimerState } from './timer';

export interface PersistedAppData {
  version: number;
  tasks: Task[];
  sessions: FocusSession[];
  activeTaskId: string | null;
  timer: TimerState;
  settings: AppSettings;
}
