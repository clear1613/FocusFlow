export type TaskStatus = 'todo' | 'completed';

export interface Task {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  status: TaskStatus;
  createdAt: number;
  completedAt: number | null;
}
