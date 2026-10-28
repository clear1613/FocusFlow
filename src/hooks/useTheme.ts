import { useLayoutEffect } from 'react';
import { applyResolvedTheme, resolveTheme } from '../services/themeService';
import { useSettingsStore } from '../stores/settingsStore';

export function useTheme(): void {
  const theme = useSettingsStore((state) => state.settings.theme);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      applyResolvedTheme(resolveTheme(theme, media.matches));
    };

    apply();
    if (theme !== 'system') return;

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }

    media.addListener(apply);
    return () => media.removeListener(apply);
  }, [theme]);
}
