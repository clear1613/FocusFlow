import { create } from 'zustand';
import type { FocusSession } from '../types';

interface SessionStore {
  sessions: FocusSession[];
  hydrate: (sessions: FocusSession[]) => void;
  append: (session: FocusSession) => void;
  replace: (sessions: FocusSession[]) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  hydrate: (sessions) => set({ sessions }),
  append: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),
  replace: (sessions) => set({ sessions }),
}));
