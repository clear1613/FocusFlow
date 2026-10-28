import { useState, type FormEvent } from 'react';
import { useI18n } from '../../hooks/useI18n';
import type { Task } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function TaskEditDialog({
  task,
  onSave,
  onCancel,
}: {
  task: Task | null;
  onSave: (title: string, estimatedPomodoros: number) => void;
  onCancel: () => void;
}) {
  if (!task) return null;
  return <TaskEditForm key={task.id} task={task} onSave={onSave} onCancel={onCancel} />;
}

function TaskEditForm({ task, onSave, onCancel }: {
  task: Task;
  onSave: (title: string, estimatedPomodoros: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const { t } = useI18n();
  const [estimate, setEstimate] = useState(task.estimatedPomodoros);

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onSave(clean, Math.min(99, Math.max(1, estimate)));
  }

  return (
    <Modal
      open={task !== null}
      title={t('editTask')}
      description={t('editTaskDescription')}
      onClose={onCancel}
      size="md"
    >
      <form onSubmit={submit}>
        <label className="grid gap-1 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">{t('taskName')}</span>
          <input
            aria-label={t('taskName')}
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
          />
        </label>

        <label className="mt-3 grid gap-1 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">
            {t('estimatedPomodoros')}
          </span>
          <input
            aria-label={t('estimatedPomodoros')}
            type="number"
            min={1}
            max={99}
            value={estimate}
            onChange={(event) => setEstimate(Number(event.target.value) || 1)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
