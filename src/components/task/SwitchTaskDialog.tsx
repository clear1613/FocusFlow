import { useI18n } from '../../hooks/useI18n';
import { assignTask } from '../../services/taskAssignment';
import { useTaskStore } from '../../stores/taskStore';
import { ConfirmDialog } from '../common/ConfirmDialog';

/**
 * Confirmation for switching the current task while a Session is bound.
 *
 * Shared by the timer card and the task list so both entry points describe the
 * same consequence. `taskId === null` keeps the dialog closed.
 */
export function SwitchTaskDialog({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const task = tasks.find((item) => item.id === taskId);

  return (
    <ConfirmDialog
      open={taskId !== null}
      title={t('switchTaskTitle')}
      description={t('switchTaskDescription', { title: task?.title ?? t('newTask') })}
      confirmLabel={t('switchTask')}
      onCancel={onClose}
      onConfirm={() => {
        if (taskId) assignTask(taskId);
        onClose();
      }}
    />
  );
}
