import { describe, expect, it } from 'vitest';
import type { FocusSession, Task } from '../types';
import { getDefaultHistoryFilters, queryHistory } from './historyService';
import { getTodayStats } from './statisticsService';

const now = new Date(2026, 9, 29, 12);
const time = (day: number, hour = 12, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const task: Task = { id: 'a', title: '论文写作', status: 'todo', createdAt: time(1), completedAt: null, estimatedPomodoros: 3, completedPomodoros: 1 };
function session(id: string, end: number, patch: Partial<FocusSession> = {}): FocusSession {
  return { id, type: 'focus', status: 'completed', taskId: 'a', startedAt: end - 1500000, endedAt: end, completedAt: end, actualDurationSeconds: 1500, plannedDurationSeconds: 1500, ...patch };
}
const filters = () => ({ ...getDefaultHistoryFilters(now), range: 'today' as const });

describe('focus history queries', () => {
  it('defaults to seven local calendar days inclusive of today', () => {
    expect(getDefaultHistoryFilters(now)).toMatchObject({ range: '7d', from: '2026-10-23', to: '2026-10-29', task: 'all', status: 'all' });
    const result = queryHistory([session('before', time(22, 23, 59)), session('first', time(23, 0)), session('today', time(29, 23, 59)), session('future', time(30, 0))], [task], getDefaultHistoryFilters(now), now);
    expect(result.records.map(r => r.id)).toEqual(['today', 'first']);
  });

  it('uses completion day across midnight and keeps cancelled/skipped separate from focus totals', () => {
    const records = [session('cross', time(29, 0, 10)), session('cancel', time(29, 10), { status: 'cancelled', completedAt: null, actualDurationSeconds: 120 }), session('skip', time(29, 11), { status: 'skipped', completedAt: null, actualDurationSeconds: 30 }), session('running', time(29, 12), { status: 'running', endedAt: null, completedAt: null }), session('break', time(29, 13), { type: 'short_break' })];
    const result = queryHistory(records, [task], filters(), now);
    expect(result.records.map(r => r.id)).toEqual(['skip', 'cancel', 'cross']);
    expect(result.days).toHaveLength(1);
    expect(result.summary).toEqual({ completedCount: 1, focusSeconds: 1500, focusMinutes: 25 });
    expect(result.summary.focusMinutes).toBe(getTodayStats(records, [task], now).focusMinutes);
  });

  it('sums seconds before rounding and does not mutate session or task arrays', () => {
    const records = [session('b', time(29, 10), { actualDurationSeconds: 30 }), session('a', time(29, 10), { actualDurationSeconds: 31 })];
    const original = structuredClone(records);
    const tasks = [structuredClone(task)];
    const result = queryHistory(records, tasks, filters(), now);
    expect(result.records.map(r => r.id)).toEqual(['a', 'b']);
    expect(result.summary.focusMinutes).toBe(1);
    expect(result.days[0].summary).toEqual(result.summary);
    expect(records).toEqual(original);
    expect(tasks).toEqual([task]);
  });

  it('filters existing, deleted and unassigned tasks without discarding history', () => {
    const records = [session('kept', time(29, 10)), session('deleted', time(29, 11), { taskId: 'gone' }), session('free', time(29, 12), { taskId: null })];
    expect(queryHistory(records, [task], { ...filters(), task: 'task:a' }, now).records.map(r => r.id)).toEqual(['kept']);
    const deleted = queryHistory(records, [task], { ...filters(), task: 'deleted' }, now);
    expect(deleted.records.map(r => r.id)).toEqual(['deleted']);
    expect(deleted.records[0].taskTitle).toBeNull();
    expect(queryHistory(records, [task], { ...filters(), task: 'unassigned' }, now).records.map(r => r.id)).toEqual(['free']);
    expect(queryHistory(records, [], filters(), now).records).toHaveLength(3);
  });

  it('applies status and task filters to both rows and daily summaries', () => {
    const records = [session('done', time(29, 9)), session('cancel', time(29, 10), { status: 'cancelled', completedAt: null, actualDurationSeconds: 60 })];
    const result = queryHistory(records, [task], { ...filters(), status: 'cancelled', task: 'task:a' }, now);
    expect(result.records.map(r => r.id)).toEqual(['cancel']);
    expect(result.summary).toEqual({ completedCount: 0, focusSeconds: 0, focusMinutes: 0 });
    expect(result.days[0].summary.completedCount).toBe(0);
  });

  it('includes both ends of a custom local date range and orders groups newest first', () => {
    const result = queryHistory([session('first', time(1, 0)), session('last', time(2, 23, 59)), session('outside', time(3, 0))], [task], { ...filters(), range: 'custom', from: '2026-10-01', to: '2026-10-02' }, now);
    expect(result.days.map(d => d.dateKey)).toEqual(['2026-10-02', '2026-10-01']);
    expect(result.summary.completedCount).toBe(2);
  });

  it.each([['', '2026-10-29', 'invalidDate'], ['2026-02-30', '2026-10-29', 'invalidDate'], ['2026-10-30', '2026-10-29', 'dateOrder']])('rejects invalid custom ranges (%s, %s)', (from, to, error) => {
    const result = queryHistory([session('done', time(29))], [task], { ...filters(), range: 'custom', from, to }, now);
    expect(result.error).toBe(error);
    expect(result.records).toEqual([]);
  });

  it('uses thirty calendar days and ignores custom fields for preset ranges', () => {
    const result = queryHistory([session('last-month', time(0)), session('start', time(0, 0)), session('before', time(-1, 23, 59))], [task], { ...filters(), range: '30d', from: '', to: '' }, now);
    expect(result.from).toBe('2026-09-30');
    expect(result.records.map(r => r.id)).toEqual(['last-month', 'start']);
  });

  it('uses calendar boundaries on a daylight-saving change as well as ordinary days', () => {
    const day = new Date(2026, 10, 1, 12);
    const midnight = new Date(2026, 10, 1).getTime();
    const nextMidnight = new Date(2026, 10, 2).getTime();
    const result = queryHistory([session('first', midnight), session('last', nextMidnight - 1), session('next', nextMidnight)], [], { ...filters(), range: 'today' }, day);
    expect(result.records.map(r => r.id)).toEqual(['last', 'first']);
  });
});
