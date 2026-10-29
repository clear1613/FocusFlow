import { expect, it } from 'vitest';
import { createHistoryCsv, getHistoryTaskLabel } from './historyCsvService';
import { queryHistory, getDefaultHistoryFilters } from './historyService';
import type { FocusSession, Task } from '../types';

const now = new Date(2026, 9, 29, 12);
const end = now.getTime();
const session: FocusSession = { id: 'session', taskId: 'task', type: 'focus', status: 'completed', startedAt: end - 1500000, endedAt: end, completedAt: end, actualDurationSeconds: 1499, plannedDurationSeconds: 1500 };
const task: Task = { id: 'task', title: '论文, "第一章"\n修改 🍅', status: 'todo', estimatedPomodoros: 1, completedPomodoros: 1, createdAt: 1, completedAt: null };
function records(title = task.title) { return queryHistory([session], [{ ...task, title }], getDefaultHistoryFilters(now), now).records; }

it('exports a UTF-8 BOM, CRLF records, lossless seconds, and quoted Unicode/multiline titles', () => {
  const csv = createHistoryCsv(records(), 'zh-CN');
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"论文, ""第一章""\n修改 🍅"');
  expect(csv).toContain('"1499","1500"');
  expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
  expect(csv.endsWith('\r\n')).toBe(true);
  expect(csv).toContain('实际时长（秒）');
});

it.each(['=SUM(1,2)', '+1+1', '-2+3', '@SUM(A1)', '\t=1', ' \uFEFF+1'])('neutralizes spreadsheet formula-like task text: %s', (title) => {
  expect(createHistoryCsv(records(title), 'en')).toContain('"\'' + title + '"');
});

it('localizes deleted and unassigned labels in the UI and CSV', () => {
  const deleted = queryHistory([session, { ...session, id: 'unassigned', taskId: null }], [], getDefaultHistoryFilters(now), now).records;
  expect(getHistoryTaskLabel(deleted.find(r => r.id === 'session')!, 'zh-CN')).toBe('已删除任务');
  expect(createHistoryCsv(deleted, 'en')).toContain('"Deleted task"');
  expect(createHistoryCsv(deleted, 'en')).toContain('"Unassigned"');
  expect(createHistoryCsv(deleted, 'en')).toContain('Actual duration (seconds)');
});
