import { beforeEach, expect, it } from 'vitest';
import { createDefaultAppData } from '../constants/defaults';
import { useToastStore } from '../stores/toastStore';
import { useSessionStore } from '../stores/sessionStore';
import { useTimerStore } from '../stores/timerStore';
import { initializeApp } from './initializeApp';
import { storageService } from './storageService';

beforeEach(() => {
  localStorage.clear();
  storageService.load();
  useToastStore.getState().clear();
});

it('hydrates safe defaults and supplies recovery feedback for damaged JSON', () => {
  localStorage.setItem('focusflow:data', '{bad');
  expect(initializeApp()).toBe('recovered');
  expect(useTimerStore.getState().timer.status).toBe('idle');
  expect(useToastStore.getState().toasts[0].title).toBe('本地数据恢复');
});

it('preserves future data and reports write protection', () => {
  localStorage.setItem('focusflow:data', '{"version":999}');
  expect(initializeApp()).toBe('incompatible');
  expect(localStorage.getItem('focusflow:data')).toBe('{"version":999}');
  expect(useToastStore.getState().toasts).toHaveLength(1);
});

it('restores an expired session once and shows completion feedback', () => {
  const data = createDefaultAppData();
  const endAt = Date.now() - 60_000;
  const startAt = endAt - 1_500_000;
  data.sessions = [{
    id: 'expired', taskId: null, type: 'focus', status: 'running',
    startedAt: startAt, endedAt: null, completedAt: null,
    plannedDurationSeconds: 1500, actualDurationSeconds: 0,
  }];
  data.timer = { ...data.timer, status: 'running', startedAt: startAt,
    endAt, activeSessionId: 'expired' };
  localStorage.setItem('focusflow:data', JSON.stringify(data));
  initializeApp();
  initializeApp();
  expect(useSessionStore.getState().sessions).toHaveLength(1);
  expect(useSessionStore.getState().sessions[0].completedAt).toBe(endAt);
  expect(useToastStore.getState().toasts.filter(t => t.title === '专注完成')).toHaveLength(1);
});
