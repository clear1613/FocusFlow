import { useState, type FormEvent } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { persistAppState } from '../../services/persistAppState';
import { hasTaskHistory } from '../../services/taskService';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTimerStore } from '../../stores/timerStore';
import type { Task } from '../../types';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TaskEditDialog } from './TaskEditDialog';

export function TaskList() {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const setActiveTask = useTaskStore((s) => s.setActiveTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const todoTasks = tasks.filter((task) => task.status === 'todo');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const pendingTask = tasks.find((task) => task.id === pendingTaskId);
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const deletingTask = tasks.find((task) => task.id === deletingTaskId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;

    createTask({
      title: clean.slice(0, 80),
      estimatedPomodoros: Math.min(99, Math.max(1, estimate)),
    });
    setTitle('');
    setEstimate(1);
    persistAppState();
  }

  function assignTask(taskId: string) {
    if (taskId === activeTaskId) return;

    const timer = useTimerStore.getState().timer;
    if (
      (timer.status === 'running' || timer.status === 'paused') &&
      timer.activeSessionId
    ) {
      setPendingTaskId(taskId);
      return;
    }

    setActiveTask(taskId);
    persistAppState();
  }

  function confirmRunningTaskSwitch() {
    if (!pendingTaskId) return;

    const timer = useTimerStore.getState().timer;
    if (timer.activeSessionId) {
      useSessionStore.getState().replace(
        useSessionStore.getState().sessions.map((session) =>
          session.id === timer.activeSessionId && session.status === 'running'
            ? { ...session, taskId: pendingTaskId }
            : session,
        ),
      );
    }

    setActiveTask(pendingTaskId);
    setPendingTaskId(null);
    persistAppState();
  }

  function requestDelete(task: Task) {
    if (hasTaskHistory(useSessionStore.getState().sessions, task.id)) {
      setDeletingTaskId(task.id);
      return;
    }

    deleteTask(task.id);
    persistAppState();
  }

  function confirmDelete() {
    if (!deletingTaskId) return;
    deleteTask(deletingTaskId);
    setDeletingTaskId(null);
    persistAppState();
  }

  function saveEdit(taskId: string, nextTitle: string, nextEstimate: number) {
    updateTask(taskId, {
      title: nextTitle,
      estimatedPomodoros: nextEstimate,
    });
    setEditingTaskId(null);
    persistAppState();
  }

  return (
    <>
      <section className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('tasks')}</h2>
          <span className="text-sm text-neutral-400">{t('openTasks', { count: todoTasks.length })}</span>
        </div>

        <form
          onSubmit={submit}
          className="mb-5 grid gap-2 sm:grid-cols-[1fr_100px_auto]"
        >
          <label className="sr-only" htmlFor="new-task-title">
            {t('taskName')}
          </label>
          <input
            id="new-task-title"
            aria-label={t('taskName')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            placeholder={t('taskPlaceholder')}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
          />
          <input
            type="number"
            min={1}
            max={99}
            value={estimate}
            onChange={(event) => setEstimate(Number(event.target.value) || 1)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
            aria-label={t('estimatedPomodoros')}
          />
          <Button type="submit">{t('add')}</Button>
        </form>

        <div className="space-y-2">
          {todoTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
              {t('tasksEmpty')}
            </div>
          ) : (
            todoTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                active={task.id === activeTaskId}
                canSelect
                onSelect={() => assignTask(task.id)}
                onEdit={() => setEditingTaskId(task.id)}
                onComplete={() => {
                  completeTask(task.id);
                  persistAppState();
                }}
                onDelete={() => requestDelete(task)}
              />
            ))
          )}
        </div>

        {completedTasks.length > 0 ? (
          <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-1 py-2 text-left text-sm font-medium text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:hover:text-white dark:focus-visible:ring-white"
              aria-expanded={completedOpen}
              aria-controls="completed-task-list"
              onClick={() => setCompletedOpen((open) => !open)}
            >
              <span>{t('completed')}</span>
              <span className="text-xs text-neutral-400">
                {completedTasks.length} · {t(completedOpen ? 'hide' : 'show')}
              </span>
            </button>

            {completedOpen ? (
              <div id="completed-task-list" className="mt-2 space-y-2">
                {completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    active={false}
                    canSelect={false}
                    onSelect={() => undefined}
                    onEdit={() => setEditingTaskId(task.id)}
                    onDelete={() => requestDelete(task)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <TaskEditDialog
        task={editingTask}
        onCancel={() => setEditingTaskId(null)}
        onSave={(nextTitle, nextEstimate) => {
          if (!editingTask) return;
          saveEdit(editingTask.id, nextTitle, nextEstimate);
        }}
      />

      <ConfirmDialog
        open={pendingTaskId !== null}
        title={t('switchTaskTitle')}
        description={t('switchTaskDescription', { title: pendingTask?.title ?? t('newTask') })}
        confirmLabel={t('switchTask')}
        onCancel={() => setPendingTaskId(null)}
        onConfirm={confirmRunningTaskSwitch}
      />

      <ConfirmDialog
        open={deletingTaskId !== null}
        title={t('deleteTaskTitle')}
        description={t('deleteTaskDescription', { title: deletingTask?.title ?? t('thisTask') }) + (deletingTaskId === activeTaskId ? t('clearActiveTask') : '')}
        confirmLabel={t('delete')}
        onCancel={() => setDeletingTaskId(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function TaskRow({
  task,
  active,
  canSelect,
  onSelect,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: Task;
  active: boolean;
  canSelect: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onComplete?: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <article
      className={`flex flex-col items-stretch gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center ${
        active
          ? 'border-neutral-900 dark:border-white'
          : 'border-neutral-200 dark:border-neutral-800'
      } ${task.status === 'completed' ? 'opacity-75' : ''}`}
    >
      <button
        type="button"
        disabled={!canSelect}
        className="min-h-11 min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-default dark:focus-visible:ring-white"
        onClick={onSelect}
      >
        <div className={`truncate font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
          {task.title}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          {t('taskProgress', { done: task.completedPomodoros, total: task.estimatedPomodoros })}
        </div>
      </button>

      <div className="flex flex-wrap justify-end gap-1 sm:flex-nowrap">
        <Button variant="ghost" onClick={onEdit}>
          {t('edit')}
        </Button>
        {onComplete ? (
          <Button variant="ghost" onClick={onComplete}>
            {t('done')}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onDelete}>
          {t('delete')}
        </Button>
      </div>
    </article>
  );
}
