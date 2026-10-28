import { describe, expect, it } from 'vitest';
import { resolveTheme } from './themeService';

describe('themeService', () => {
  it('uses explicit light mode regardless of system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('uses explicit dark mode regardless of system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows system preference in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});
