import { beforeEach, expect, it, vi } from 'vitest';
import { createDefaultAppData, STORAGE_KEY } from '../constants/defaults';
import { useTabStore } from '../stores/tabStore';
import { useTaskStore } from '../stores/taskStore';
import { useSessionStore } from '../stores/sessionStore';
import { storageService } from './storageService';
import { startTabCoordination } from './tabCoordinator';

beforeEach(() => { localStorage.clear(); storageService.load(); });

function queuedLock() {
  let grant!: () => Promise<void>;
  const acquireLock = vi.fn((signal: AbortSignal, acquired: () => Promise<void>) => new Promise<void>((resolve, reject) => {
    grant = () => { const work = acquired(); void work.then(resolve, reject); return work; };
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  return { acquireLock, grant: () => grant() };
}

it('loads a reader snapshot while waiting and syncs only relevant storage events', () => {
  const events = new EventTarget(), lock = queuedLock();
  const stop = startTabCoordination({ events, acquireLock: lock.acquireLock });
  try {
    expect(useTabStore.getState().role).toBe('reader');
    const data = createDefaultAppData();
    data.tasks = [{ id: 'saved', title: '另一个页面的新任务', status: 'todo', estimatedPomodoros: 1, completedPomodoros: 0, createdAt: 1, completedAt: null }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    events.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(useTaskStore.getState().tasks).toHaveLength(0);
    events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(useTaskStore.getState().tasks).toEqual(data.tasks);
    localStorage.clear();
    events.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  } finally { stop(); }
});

it('rereads the latest snapshot and recovers an expired session only after acquiring the lock', async () => {
  const lock = queuedLock();
  const stop = startTabCoordination({ events: new EventTarget(), acquireLock: lock.acquireLock });
  const data = createDefaultAppData(), endAt = Date.now() - 1000;
  data.sessions = [{ id: 'one', type: 'focus', taskId: null, status: 'running', startedAt: endAt - 1500000, endedAt: null, completedAt: null, plannedDurationSeconds: 1500, actualDurationSeconds: 0 }];
  data.timer = { ...data.timer, status: 'running', activeSessionId: 'one', startedAt: endAt - 1500000, endAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const published: string[][] = [];
  const unsubscribe = useTabStore.subscribe(tab => {
    if (tab.role === 'writer') published.push(useSessionStore.getState().sessions.map(session => `${session.id}:${session.status}`));
  });
  const held = lock.grant();
  try {
    expect(useTabStore.getState().role).toBe('writer');
    expect(useSessionStore.getState().sessions[0]).toMatchObject({ id: 'one', status: 'completed', completedAt: endAt });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).sessions).toHaveLength(1);
    expect(published).toEqual([['one:completed']]);
  } finally { unsubscribe(); stop(); await held; }
});

it('revokes access before pagehide releases the lock and requeues on pageshow', async () => {
  const lock = queuedLock(), events = new EventTarget();
  const stop = startTabCoordination({ events, acquireLock: lock.acquireLock });
  const held = lock.grant();
  try {
    expect(useTabStore.getState().role).toBe('writer');
    events.dispatchEvent(new Event('pagehide'));
    expect(useTabStore.getState().role).toBe('checking');
    expect(storageService.save(createDefaultAppData())).toBe(false);
    await held;
    events.dispatchEvent(new Event('pageshow'));
    expect(lock.acquireLock).toHaveBeenCalledTimes(2);
    expect(useTabStore.getState().role).toBe('reader');
  } finally { stop(); }
});

it('ignores a late grant after cancellation and removes all lifecycle listeners on stop', async () => {
  const lock = queuedLock(), events = new EventTarget();
  const stop = startTabCoordination({ events, acquireLock: lock.acquireLock });
  stop();
  await lock.grant();
  expect(useTabStore.getState().role).toBe('checking');
  events.dispatchEvent(new Event('pageshow'));
  expect(lock.acquireLock).toHaveBeenCalledTimes(1);
});

it('keeps data read-only when lock support is unavailable or acquiring fails', async () => {
  const saved = JSON.stringify(createDefaultAppData());
  localStorage.setItem(STORAGE_KEY, saved);
  const stop = startTabCoordination({ events: new EventTarget() });
  expect(useTabStore.getState().role).toBe('unsupported');
  expect(storageService.clear()).toBe(false);
  expect(storageService.save(createDefaultAppData())).toBe(false);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  stop();
  const failed = startTabCoordination({ events: new EventTarget(), acquireLock: async () => { throw new Error('Permission denied'); } });
  await Promise.resolve();
  expect(useTabStore.getState().role).toBe('unsupported');
  failed();
});
