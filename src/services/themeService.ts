import type { ThemeMode } from '../types';

export function resolveTheme(
  theme: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

export function applyResolvedTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
}
