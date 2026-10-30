import { Component, Suspense, type ReactNode } from 'react';
import { useI18n } from '../../hooks/useI18n';

class PanelBoundary extends Component<{ children: ReactNode; message: string; reload: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <section role="alert" className="min-h-64 rounded-2xl border border-neutral-200 bg-white p-6 text-sm leading-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p>{this.props.message}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-xl border border-neutral-300 px-4 dark:border-neutral-600">{this.props.reload}</button>
      </section>
    );
    return this.props.children;
  }
}

export function DeferredPanel({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <PanelBoundary message={t('panel.failed')} reload={t('panel.reload')}>
      <Suspense fallback={<section role="status" aria-busy="true" className="flex min-h-80 items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{t('panel.loading')}</section>}>
        {children}
      </Suspense>
    </PanelBoundary>
  );
}
