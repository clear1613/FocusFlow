import { beforeEach, describe, expect, it } from 'vitest';
import { showToast, useToastStore } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => useToastStore.getState().clear());

  it('adds and removes a toast', () => {
    const id = showToast({ title: 'Saved', tone: 'success' });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    useToastStore.getState().remove(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('caps the visible queue at four messages', () => {
    for (let i = 0; i < 6; i += 1) {
      showToast({ title: `Toast ${i}` });
    }
    expect(useToastStore.getState().toasts).toHaveLength(4);
    expect(useToastStore.getState().toasts[0].title).toBe('Toast 2');
  });
});
