import { useTaskStore } from '../../stores/taskStore';
import { useI18n } from '../../hooks/useI18n';

export function ActiveTask() {
  const { t } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const task = tasks.find((item) => item.id === activeTaskId);

  return (
    <div
      className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        {t('activeTask')}
      </div>
      <div className="mt-1 break-words font-medium">
        {task ? task.title : t('noActiveTask')}
      </div>
      {task ? (
        <div className="mt-1 text-sm text-neutral-400">
          {t('taskProgress', { done: task.completedPomodoros, total: task.estimatedPomodoros })}
        </div>
      ) : null}
    </div>
  );
}
