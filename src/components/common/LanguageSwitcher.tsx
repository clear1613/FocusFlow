import { Languages } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { persistAppState } from '../../services/persistAppState';
import { useSettingsStore } from '../../stores/settingsStore';

export function LanguageSwitcher() {
  const { locale, t } = useI18n();

  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus-within:ring-2 focus-within:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus-within:ring-white">
      <Languages aria-hidden="true" size={16} className="shrink-0" />
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (nextLocale !== 'en' && nextLocale !== 'zh-CN') return;
          useSettingsStore.getState().patch({ locale: nextLocale });
          persistAppState();
        }}
        className="min-h-11 cursor-pointer bg-transparent pr-1 outline-none dark:bg-neutral-900"
      >
        <option value="zh-CN" lang="zh-CN">中文</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  );
}
