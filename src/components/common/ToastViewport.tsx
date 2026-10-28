import { useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import type { ToastMessage } from '../../stores/toastStore';
import { useToastStore } from '../../stores/toastStore';

const toneClass: Record<ToastMessage['tone'], string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  info:
    'border-neutral-200 bg-white text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white',
  warning:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
  error:
    'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[360px]"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const { t } = useI18n();
  const remove = useToastStore((state) => state.remove);

  useEffect(() => {
    const timer = window.setTimeout(() => remove(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [remove, toast.durationMs, toast.id]);

  return (
    <div
      className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg ${toneClass[toast.tone]}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.description ? (
            <p className="mt-1 text-sm leading-5 opacity-75">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          aria-label={t('dismiss', { title: toast.title })}
          onClick={() => remove(toast.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
