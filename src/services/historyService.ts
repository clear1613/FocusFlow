import { addDays, format, isValid, parseISO, startOfDay, subDays } from 'date-fns';
import type { FocusSession, Task } from '../types';
import type { HistoryDay, HistoryFilters, HistoryRecord, HistoryResult, HistorySummary } from '../types/history';

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export function getDefaultHistoryFilters(now = new Date()): HistoryFilters {
  return { range: '7d', from: dateKey(subDays(now, 6)), to: dateKey(now), task: 'all', status: 'all' };
}

function parseLocalDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseISO(value);
  return isValid(parsed) && dateKey(parsed) === value ? startOfDay(parsed) : null;
}

function summarize(records: HistoryRecord[]): HistorySummary {
  let completedCount = 0, focusSeconds = 0;
  for (const record of records) {
    if (record.status !== 'completed') continue;
    completedCount++;
    focusSeconds += Math.max(0, record.actualDurationSeconds);
  }
  return { completedCount, focusSeconds, focusMinutes: Math.round(focusSeconds / 60) };
}

export function queryHistory(sessions: FocusSession[], tasks: Task[], filters: HistoryFilters, now = new Date()): HistoryResult {
  const today = startOfDay(now);
  const from = filters.range === 'custom' ? parseLocalDay(filters.from)
    : subDays(today, filters.range === '30d' ? 29 : filters.range === '7d' ? 6 : 0);
  const to = filters.range === 'custom' ? parseLocalDay(filters.to) : today;
  const empty = (error: HistoryResult['error']): HistoryResult => ({ error, from: filters.from, to: filters.to, records: [], days: [], summary: summarize([]) });
  if (!from || !to) return empty('invalidDate');
  if (from > to) return empty('dateOrder');
  // The end is the next local midnight, not a fixed 24-hour duration (DST).
  const endExclusive = addDays(to, 1).getTime();
  const taskNames = new Map(tasks.map(task => [task.id, task.title]));
  const records: HistoryRecord[] = [];
  for (const session of sessions) {
    if (session.type !== 'focus' || session.status === 'running') continue;
    const at = session.status === 'completed' ? session.completedAt : session.endedAt;
    if (at === null || at < from.getTime() || at >= endExclusive) continue;
    if (filters.status !== 'all' && session.status !== filters.status) continue;
    if (filters.task === 'unassigned' && session.taskId !== null) continue;
    if (filters.task === 'deleted' && (session.taskId === null || taskNames.has(session.taskId))) continue;
    if (filters.task.startsWith('task:') && session.taskId !== filters.task.slice(5)) continue;
    records.push({ ...session, status: session.status, at, dateKey: dateKey(new Date(at)), taskTitle: session.taskId === null ? null : taskNames.get(session.taskId) ?? null });
  }
  records.sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const days = new Map<string, HistoryDay>();
  for (const record of records) {
    let group = days.get(record.dateKey);
    if (!group) {
      group = { dateKey: record.dateKey, dayStart: startOfDay(new Date(record.at)).getTime(), records: [], summary: summarize([]) };
      days.set(record.dateKey, group);
    }
    group.records.push(record);
  }
  for (const group of days.values()) group.summary = summarize(group.records);
  return { error: null, from: dateKey(from), to: dateKey(to), records, days: [...days.values()], summary: summarize(records) };
}
