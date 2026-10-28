import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import type { AppSettings } from '../types';

interface SettingsStore {
  settings: AppSettings;
  hydrate: (settings: AppSettings) => void;
  patch: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrate: (settings) => set({ settings }),
  patch: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),
  reset: () => set({ settings: { ...DEFAULT_SETTINGS } }),
}));
