import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import { HistoryView } from './components/history/HistoryView';
import { ToastViewport } from './components/common/ToastViewport';
import { LanguageSwitcher } from './components/common/LanguageSwitcher';
import { useI18n } from './hooks/useI18n';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { TodayStats } from './components/statistics/TodayStats';
import { WeeklyChart } from './components/statistics/WeeklyChart';
import { TaskList } from './components/task/TaskList';
import { TimerCard } from './components/timer/TimerCard';
import { useTheme } from './hooks/useTheme';
import type { StorageNotice } from './services/initializeApp';

export default function App({ initialStorageNotice = null }: { initialStorageNotice?: StorageNotice }) {
  useTheme();
  const { locale, t } = useI18n();
  const [showHistory, setShowHistory] = useState(false);
  const historyButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
  }, [locale, t]);

  const [storageNotice, setStorageNotice] = useState<StorageNotice>(initialStorageNotice);

  useEffect(() => {
    const onStorageReset = () => setStorageNotice(null);
    window.addEventListener('focusflow:storage-reset', onStorageReset);
    window.addEventListener('focusflow:storage-restored', onStorageReset);
    return () => {
      window.removeEventListener('focusflow:storage-reset', onStorageReset);
      window.removeEventListener('focusflow:storage-restored', onStorageReset);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f5f2] px-3 py-4 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50 sm:px-6 sm:py-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-950 focus:shadow-lg"
      >
        {t('skipContent')}
      </a>

      <main id="main-content" className="mx-auto max-w-5xl" tabIndex={-1}>
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FocusFlow</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('tagline')}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button ref={historyButton} type="button" aria-label={t(showHistory ? 'history.back' : 'history.open')} title={t(showHistory ? 'history.back' : 'history.title')}
              onClick={() => { setShowHistory(!showHistory); if (showHistory) historyButton.current?.focus(); }}
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-sm text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950">
              {showHistory ? <ArrowLeft size={18} aria-hidden="true" /> : <History size={18} aria-hidden="true" />}
              <span className={showHistory ? '' : 'hidden sm:inline'}>{t(showHistory ? 'history.back' : 'history.title')}</span>
            </button>
            <SettingsDialog />
          </div>
        </header>

        {storageNotice === 'incompatible' ? (
          <div
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
            role="alert"
          >
            {t('storageProtectedBanner')}
          </div>
        ) : null}

        {storageNotice === 'recovered' ? (
          <div
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
            role="status"
          >
            {t('storageRecoveryBanner')}
          </div>
        ) : null}

        {storageNotice === 'migrated' ? (
          <div
            className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            role="status"
          >
            {t('storageMigratedBanner')}
          </div>
        ) : null}

        {showHistory ? <HistoryView /> : null}

        {/* Keep the timer and task draft mounted while history is visible. */}
        <div hidden={showHistory}>
          {/* The timer spans the today/weekly rows on desktop. On mobile the
              DOM order is timer, today, tasks, weekly. */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1.35fr_.65fr]">
            <div className="min-w-0 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <TimerCard />
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              <TodayStats />
            </div>
            <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-3">
              <TaskList />
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-2">
              {!showHistory ? <WeeklyChart /> : null}
            </div>
          </div>
        </div>

        <footer className="py-8 text-center text-xs text-neutral-400">
          {t('privacy')}
        </footer>
      </main>

      <ToastViewport />
    </div>
  );
}
