import { create } from 'zustand';
import type { StorageNotice } from '../services/initializeApp';

export type TabRole = 'checking' | 'initializing' | 'reader' | 'writer' | 'unsupported';

export const useTabStore = create<{ role: TabRole; storageNotice: StorageNotice }>(() => ({
  role: 'checking', storageNotice: null,
}));

export const canWriteAppData = () => ['writer', 'initializing'].includes(useTabStore.getState().role);
