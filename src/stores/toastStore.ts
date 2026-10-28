import { create } from 'zustand';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs: number;
}

interface PushToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  push: (toast: PushToastInput) => string;
  remove: (id: string) => void;
  clear: () => void;
}

function toastId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `toast_${crypto.randomUUID()}`;
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: ({
    title,
    description,
    tone = 'info',
    durationMs = 4200,
  }) => {
    const id = toastId();
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, title, description, tone, durationMs },
      ].slice(-4),
    }));
    return id;
  },

  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}));

export function showToast(input: PushToastInput): string {
  return useToastStore.getState().push(input);
}
