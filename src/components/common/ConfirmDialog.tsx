import { Button } from './Button';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel ?? t('confirm')}</Button>
        </div>
      }
    />
  );
}
