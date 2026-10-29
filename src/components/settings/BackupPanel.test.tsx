import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';
import { createDefaultAppData } from '../../constants/defaults';
import { createBackup } from '../../services/backupService';
import { initializeApp } from '../../services/initializeApp';
import { useTaskStore } from '../../stores/taskStore';
import { useSettingsStore } from '../../stores/settingsStore';

beforeEach(() => { localStorage.clear(); initializeApp(); });
afterEach(() => vi.restoreAllMocks());

function file() {
  const data = createDefaultAppData();
  data.tasks = [{ id: 'restored', title: '备份里的任务', estimatedPomodoros: 2, completedPomodoros: 0, status: 'todo', createdAt: 1, completedAt: null }];
  return new File([createBackup(data, new Date('2026-10-29T04:00:00Z').getTime(), '1.2.0')], 'backup.json', { type: 'application/json' });
}

it('previews a selected backup and cancellation preserves the current task', async () => {
  useTaskStore.getState().createTask({ title: '当前任务', estimatedPomodoros: 1 });
  render(<SettingsPanel />);
  fireEvent.change(screen.getByLabelText('备份文件'), { target: { files: [file()] } });
  expect(await screen.findByRole('region', { name: '备份预览' })).toHaveTextContent('1');
  expect(useTaskStore.getState().tasks[0].title).toBe('当前任务');
  fireEvent.click(screen.getByRole('button', { name: '取消导入' }));
  expect(screen.queryByRole('region', { name: '备份预览' })).toBeNull();
  expect(useTaskStore.getState().tasks[0].title).toBe('当前任务');
});

it('restores only after the explicit replace action', async () => {
  render(<SettingsPanel />);
  fireEvent.change(screen.getByLabelText('备份文件'), { target: { files: [file()] } });
  await screen.findByRole('region', { name: '备份预览' });
  expect(useTaskStore.getState().tasks).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: '确认并替换数据' }));
  expect(useTaskStore.getState().tasks[0].title).toBe('备份里的任务');
  expect(JSON.parse(localStorage.getItem('focusflow:data')!).tasks[0].title).toBe('备份里的任务');
});

it('shows an error for malformed files without writing any data', async () => {
  render(<SettingsPanel />);
  fireEvent.change(screen.getByLabelText('备份文件'), { target: { files: [new File(['{bad'], 'bad.json')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('JSON');
  expect(localStorage.getItem('focusflow:data')).toBeNull();
  expect(screen.queryByRole('button', { name: '确认并替换数据' })).toBeNull();
});

it('retains the preview and original task if persistence fails', async () => {
  useTaskStore.getState().createTask({ title: '不能丢失', estimatedPomodoros: 1 });
  render(<SettingsPanel />);
  fireEvent.change(screen.getByLabelText('备份文件'), { target: { files: [file()] } });
  await screen.findByRole('region', { name: '备份预览' });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
  fireEvent.click(screen.getByRole('button', { name: '确认并替换数据' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('存储');
  expect(useTaskStore.getState().tasks[0].title).toBe('不能丢失');
  expect(screen.getByRole('region', { name: '备份预览' })).toBeInTheDocument();
});

it('offers the same actions in English', async () => {
  useSettingsStore.getState().patch({ locale: 'en' });
  render(<SettingsPanel />);
  expect(screen.getByRole('button', { name: 'Export backup' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Backup file'), { target: { files: [file()] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm and replace data' })).toBeInTheDocument());
});
