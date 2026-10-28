import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultTimerState } from '../../constants/defaults';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { FocusSession, Task } from '../../types';
import { TaskList } from './TaskList';

const todoTask: Task = {
  id: 'task-todo',
  title: 'Write README',
  estimatedPomodoros: 3,
  completedPomodoros: 1,
  status: 'todo',
  createdAt: 1,
  completedAt: null,
};

const completedTask: Task = {
  id: 'task-completed',
  title: 'Review architecture',
  estimatedPomodoros: 2,
  completedPomodoros: 2,
  status: 'completed',
  createdAt: 1,
  completedAt: 2,
};

const historicalSession: FocusSession = {
  id: 'session-1',
  taskId: todoTask.id,
  type: 'focus',
  status: 'completed',
  startedAt: 1,
  endedAt: 2,
  plannedDurationSeconds: 1500,
  actualDurationSeconds: 1500,
  completedAt: 2,
};

beforeEach(() => {
  useSettingsStore.getState().reset();
  useSettingsStore.getState().patch({ locale: 'en' });
  localStorage.clear();
  useTaskStore.getState().hydrate([todoTask, completedTask], null);
  useSessionStore.getState().hydrate([]);
  useTimerStore.getState().hydrate(createDefaultTimerState());
});

describe('TaskList Phase 2 workflow', () => {
  it('keeps completed tasks collapsed until the user expands them', () => {
    render(<TaskList />);

    expect(screen.queryByText('Review architecture')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Completed/i }));
    expect(screen.getByText('Review architecture')).toBeTruthy();
  });

  it('edits title and estimate without changing completed pomodoros', () => {
    render(<TaskList />);

    const todoRow = screen.getByText('Write README').closest('article');
    if (!todoRow) throw new Error('Todo row not found');
    fireEvent.click(within(todoRow).getByRole('button', { name: 'Edit' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Edit task' }));
    fireEvent.change(dialog.getByLabelText('Task name'), {
      target: { value: 'Write final README' },
    });
    fireEvent.change(dialog.getByLabelText('Estimated pomodoros'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const updated = useTaskStore
      .getState()
      .tasks.find((task) => task.id === todoTask.id);
    expect(updated?.title).toBe('Write final README');
    expect(updated?.estimatedPomodoros).toBe(5);
    expect(updated?.completedPomodoros).toBe(1);
  });

  it('deletes a task without history immediately', () => {
    render(<TaskList />);

    const todoRow = screen.getByText('Write README').closest('article');
    if (!todoRow) throw new Error('Todo row not found');
    fireEvent.click(within(todoRow).getByRole('button', { name: 'Delete' }));

    expect(
      useTaskStore.getState().tasks.some((task) => task.id === todoTask.id),
    ).toBe(false);
    expect(
      screen.queryByRole('heading', { name: 'Delete task with focus history?' }),
    ).toBeNull();
  });

  it('requires confirmation for a task with history and preserves its session', () => {
    useSessionStore.getState().hydrate([historicalSession]);
    render(<TaskList />);

    const todoRow = screen.getByText('Write README').closest('article');
    if (!todoRow) throw new Error('Todo row not found');
    fireEvent.click(within(todoRow).getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: 'Delete task with focus history?',
      }),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(
      useTaskStore.getState().tasks.some((task) => task.id === todoTask.id),
    ).toBe(false);
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0].taskId).toBe(todoTask.id);
  });
});
