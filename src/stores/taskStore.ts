import { create } from 'zustand';
import { removeTaskKeepingHistory, updateTaskDetails } from '../services/taskService';
import type { Task } from '../types';
import { generateId } from '../utils/id';

interface CreateTaskInput {
  title: string;
  estimatedPomodoros: number;
}

interface TaskStore {
  tasks: Task[];
  activeTaskId: string | null;
  hydrate: (tasks: Task[], activeTaskId: string | null) => void;
  createTask: (input: CreateTaskInput) => void;
  updateTask: (id: string, patch: Pick<Task, 'title' | 'estimatedPomodoros'>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  replaceTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  activeTaskId: null,

  hydrate: (tasks, activeTaskId) => set({ tasks, activeTaskId }),

  createTask: ({ title, estimatedPomodoros }) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id: generateId('task'),
          title: title.trim(),
          estimatedPomodoros,
          completedPomodoros: 0,
          status: 'todo',
          createdAt: Date.now(),
          completedAt: null,
        },
      ],
    })),

  updateTask: (id, patch) =>
    set((state) => ({
      tasks: updateTaskDetails(state.tasks, id, patch),
    })),

  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id && task.status !== 'completed'
          ? { ...task, status: 'completed', completedAt: Date.now() }
          : task,
      ),
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: removeTaskKeepingHistory(state.tasks, id),
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
    })),

  setActiveTask: (id) => set({ activeTaskId: id }),
  replaceTasks: (tasks) => set({ tasks }),
}));
