import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { usePomodoroTimer } from './usePomodoroTimer';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 23, 30));
  localStorage.clear();
  const data = createDefaultAppData();
  data.settings.soundEnabled = false;
  useSettingsStore.getState().hydrate(data.settings);
  useTimerStore.getState().hydrate(data.timer);
  useSessionStore.getState().hydrate([]);
  useTaskStore.getState().hydrate([{
    id: 'task', title: 'Acceptance', status: 'todo', estimatedPomodoros: 4,
    completedPomodoros: 0, createdAt: Date.now(), completedAt: null,
  }], 'task');
});

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('timer workflow integration', () => {
  it('keeps one session through repeated start, pause, refresh-style hydration and resume', () => {
    const { result } = renderHook(usePomodoroTimer);
    act(() => { result.current.actions.start(); result.current.actions.start(); });
    const id = result.current.timer.activeSessionId;
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(10_000); result.current.actions.pause(); });
    expect(result.current.timer.remainingSeconds).toBe(1490);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.timer.remainingSeconds).toBe(1490);
    act(() => { result.current.actions.start(); });
    expect(result.current.timer.activeSessionId).toBe(id);
    act(() => { vi.advanceTimersByTime(1_490_000); });
    expect(useSessionStore.getState().sessions[0].actualDurationSeconds).toBe(1500);
    expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(1);
    expect(result.current.timer.completedFocusCountInCycle).toBe(1);
  });

  it('uses the deadline on a delayed visibility callback and completes only once', () => {
    const { result } = renderHook(usePomodoroTimer);
    act(() => { result.current.actions.start(); });
    const deadline = result.current.timer.endAt!;
    act(() => {
      vi.setSystemTime(new Date(2026, 9, 25, 8));
      result.current.actions.syncNow();
      document.dispatchEvent(new Event('visibilitychange'));
      result.current.actions.syncNow();
    });
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0].completedAt).toBe(deadline);
    expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(1);
    expect(result.current.timer.completedFocusCountInCycle).toBe(1);
  });

  it.each(['running', 'paused'] as const)('cancels a %s session on reset without credit', (status) => {
    const { result } = renderHook(usePomodoroTimer);
    act(() => { result.current.actions.start(); vi.advanceTimersByTime(10_000); });
    if (status === 'paused') act(() => { result.current.actions.pause(); });
    act(() => { result.current.actions.reset(); });
    expect(useSessionStore.getState().sessions[0].status).toBe('cancelled');
    expect(useSessionStore.getState().sessions[0].actualDurationSeconds).toBe(10);
    expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(0);
  });

  it('skips focus without advancing the cycle and skips break back to focus', () => {
    const { result } = renderHook(usePomodoroTimer);
    act(() => { result.current.actions.start(); result.current.actions.skip(); });
    expect(useSessionStore.getState().sessions[0].status).toBe('skipped');
    expect(result.current.timer.completedFocusCountInCycle).toBe(0);
    expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(0);
    expect(result.current.timer.mode).toBe('short_break');
    act(() => { result.current.actions.skip(); });
    expect(result.current.timer.mode).toBe('focus');
  });

  it('enters long break after four completed focus sessions and resets the cycle', () => {
    const { result } = renderHook(usePomodoroTimer);
    for (let cycle = 1; cycle <= 4; cycle++) {
      act(() => { result.current.actions.start(); vi.advanceTimersByTime(1_500_000); });
      expect(result.current.timer.mode).toBe(cycle === 4 ? 'long_break' : 'short_break');
      if (cycle < 4) act(() => { result.current.actions.skip(); });
    }
    expect(useTaskStore.getState().tasks[0].completedPomodoros).toBe(4);
    expect(result.current.timer.completedFocusCountInCycle).toBe(0);
  });
});
