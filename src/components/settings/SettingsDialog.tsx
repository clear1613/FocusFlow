import { lazy, useState } from 'react';
import { version } from '../../../package.json';
import { useI18n } from '../../hooks/useI18n';
import { Modal } from '../common/Modal';
import { DeferredPanel } from '../common/DeferredPanel';

const SettingsPanel = lazy(() => import('./SettingsPanel').then(module => ({ default: module.SettingsPanel })));

/**
 * Settings entry point: a single icon in the header that opens a dialog.
 *
 * Configuration is not part of the focus flow, so it must not occupy permanent
 * space on the main screen — the first thing a user sees should be the timer,
 * not a form.
 */
export function SettingsDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('settings.open')}
        title={t('settings')}
        className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2.4" />
          <circle cx="10" cy="17" r="2.4" />
        </svg>
      </button>

      <Modal
        open={open}
        title={t('settings')}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <p className="text-center text-xs text-neutral-400">
            {t('settings.version', { version })}
          </p>
        }
      >
        <DeferredPanel><SettingsPanel /></DeferredPanel>
      </Modal>
    </>
  );
}
