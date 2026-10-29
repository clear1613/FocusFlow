import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HistoryView } from './HistoryView';
import { initializeApp } from '../../services/initializeApp';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTaskStore } from '../../stores/taskStore';
import type { FocusSession } from '../../types';

const now = new Date(2026, 9, 29, 12).getTime();
function records(count: number): FocusSession[] {
  return Array.from({ length: count }, (_, i) => ({ id: `record-${i}`, taskId: 'task', type: 'focus', status: 'completed', startedAt: now - i * 60000 - 60000, endedAt: now - i * 60000, completedAt: now - i * 60000, actualDurationSeconds: 60, plannedDurationSeconds: 60 }));
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  localStorage.clear(); initializeApp();
  useTaskStore.getState().hydrate([{ id: 'task', title: '写作', status: 'todo', estimatedPomodoros: 2, completedPomodoros: 1, createdAt: 1, completedAt: null }], null);
  useSessionStore.getState().hydrate(records(25));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('paginates records while retaining whole-day summaries and exports every filtered row', async () => {
  const createURL = vi.fn<(blob: Blob) => string>(() => 'blob:history');
  vi.stubGlobal('URL', { createObjectURL: createURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<HistoryView />);
  expect(screen.getAllByRole('article')).toHaveLength(20);
  expect(screen.getByText('当日筛选汇总：25 次完成 · 专注 25 分钟')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  expect(screen.getAllByRole('article')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: '导出 CSV' }));
  const reader = new FileReader();
  const csv = await new Promise<string>((resolve) => { reader.onload = () => resolve(String(reader.result)); reader.readAsText(createURL.mock.calls[0][0]); });
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(26);
  expect(screen.getByText('第 2 / 2 页')).toBeVisible();
});

it('validates custom dates and disables export until the range is valid', () => {
  render(<HistoryView />);
  fireEvent.change(screen.getByLabelText('日期范围'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-10-30' } });
  expect(screen.getByRole('alert')).toHaveTextContent('开始日期不能晚于结束日期');
  expect(screen.getByRole('button', { name: '导出 CSV' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-10-29' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('button', { name: '导出 CSV' })).toBeEnabled();
});

it('resets pagination after filtering and preserves filters across language changes', () => {
  render(<HistoryView />);
  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  fireEvent.change(screen.getByLabelText('状态筛选'), { target: { value: 'cancelled' } });
  expect(screen.getByText('没有符合条件的记录，可调整日期、任务或状态筛选。')).toBeVisible();
  expect(screen.getByRole('button', { name: '导出 CSV' })).toBeDisabled();
  act(() => useSettingsStore.getState().patch({ locale: 'en' }));
  expect(screen.getByLabelText('Status filter')).toHaveValue('cancelled');
  expect(screen.getByRole('heading', { name: 'Focus history' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'all' } });
  expect(screen.getByText('Page 1 of 2')).toBeVisible();
});

it('refreshes derived rows after restored or reset data and removes stale task filters', () => {
  render(<HistoryView />);
  fireEvent.change(screen.getByLabelText('任务筛选'), { target: { value: 'task:task' } });
  act(() => { useTaskStore.getState().hydrate([], null); useSessionStore.getState().hydrate([]); });
  expect(screen.getByLabelText('任务筛选')).toHaveValue('all');
  expect(screen.getByText('还没有专注历史')).toBeVisible();
  expect(screen.getByRole('button', { name: '导出 CSV' })).toBeDisabled();
});

it('reports a failed download while retaining records and filters', () => {
  vi.stubGlobal('URL', { createObjectURL: () => { throw new Error('download unavailable'); }, revokeObjectURL: vi.fn() });
  render(<HistoryView />);
  fireEvent.click(screen.getByRole('button', { name: '导出 CSV' }));
  expect(screen.getByRole('alert')).toHaveTextContent('CSV 下载失败');
  expect(screen.getAllByRole('article')).toHaveLength(20);
  expect(useSessionStore.getState().sessions).toHaveLength(25);
});
