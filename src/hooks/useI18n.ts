import { useCallback } from 'react';
import { translate, type MessageKey } from '../services/i18n';
import { useSettingsStore } from '../stores/settingsStore';

export function useI18n() {
  const locale = useSettingsStore((state) => state.settings.locale);
  const t = useCallback((key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);
  return { locale, t };
}
