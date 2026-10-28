export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLocale = 'zh-CN' | 'en';

export interface AppSettings {
  locale: AppLocale;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  theme: ThemeMode;
}
