import { useEffect, useState } from 'react';
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

  useEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
  }, [locale, t]);

  const [storageNotice, setStorageNotice] = useState<StorageNotice>(initialStorageNotice);

  useEffect(() => {
    const onStorageReset = () => setStorageNotice(null);
    window.addEventListener('focusflow:storage-reset', onStorageReset);
    return () => window.removeEventListener('focusflow:storage-reset', onStorageReset);
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

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <TimerCard />
          <TodayStats />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <TaskList />
          <WeeklyChart />
        </div>

        <footer className="py-8 text-center text-xs text-neutral-400">
          {t('privacy')}
        </footer>
      </main>

      <ToastViewport />
    </div>
  );
}
