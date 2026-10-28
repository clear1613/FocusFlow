import { create } from 'zustand';
import { createDefaultTimerState } from '../constants/defaults';
import type { TimerMode, TimerState } from '../types';

interface TimerStore {
  timer: TimerState;
  hydrate: (timer: TimerState) => void;
  patch: (patch: Partial<TimerState>) => void;
  setMode: (mode: TimerMode, durationSeconds: number) => void;
  resetState: (durationSeconds: number) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  timer: createDefaultTimerState(),

  hydrate: (timer) => set({ timer }),

  patch: (patch) =>
    set((state) => ({
      timer: { ...state.timer, ...patch },
    })),

  setMode: (mode, durationSeconds) =>
    set((state) => ({
      timer: {
        ...state.timer,
        mode,
        status: 'idle',
        remainingSeconds: durationSeconds,
        plannedDurationSeconds: durationSeconds,
        startedAt: null,
        endAt: null,
        activeSessionId: null,
      },
    })),

  resetState: (durationSeconds) =>
    set((state) => ({
      timer: {
        ...state.timer,
        status: 'idle',
        remainingSeconds: durationSeconds,
        plannedDurationSeconds: durationSeconds,
        startedAt: null,
        endAt: null,
        activeSessionId: null,
      },
    })),
}));
