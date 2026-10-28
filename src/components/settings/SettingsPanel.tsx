import { useEffect, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { getText } from '../../services/i18n';
import { notificationService } from '../../services/notificationService';
import { persistAppState } from '../../services/persistAppState';
import { resetAppData } from '../../services/resetAppData';
import { useSettingsStore } from '../../stores/settingsStore';
import { showToast } from '../../stores/toastStore';
import { useTimerStore } from '../../stores/timerStore';
import type { ThemeMode } from '../../types';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

type DurationKey = 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes';
type NumberSettingKey = DurationKey | 'longBreakInterval';

const durationModeByKey: Record<DurationKey, 'focus' | 'short_break' | 'long_break'> = {
  focusMinutes: 'focus',
  shortBreakMinutes: 'short_break',
  longBreakMinutes: 'long_break',
};

export function SettingsPanel() {
  const { t } = useI18n();
  const settings = useSettingsStore((s) => s.settings);
  const patch = useSettingsStore((s) => s.patch);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => notificationService.getPermission());

  useEffect(() => {
    const syncPermission = () => {
      const permission = notificationService.getPermission();
      setNotificationPermission(permission);
      if (useSettingsStore.getState().settings.notificationEnabled && permission !== 'granted') {
        patch({ notificationEnabled: false });
        persistAppState();
      }
    };
    window.addEventListener('focus', syncPermission);
    return () => window.removeEventListener('focus', syncPermission);
  }, [patch]);

  function numberSetting(key: NumberSettingKey, value: number) {
    patch({ [key]: value });

    if (key !== 'longBreakInterval') {
      const timer = useTimerStore.getState().timer;
      if (timer.status === 'idle' && timer.mode === durationModeByKey[key]) {
        useTimerStore.getState().patch({
          remainingSeconds: value * 60,
          plannedDurationSeconds: value * 60,
        });
      }
    }

    persistAppState();
  }

  function booleanSetting(
    key: 'autoStartBreak' | 'autoStartFocus' | 'soundEnabled',
    value: boolean,
  ) {
    patch({ [key]: value });
    persistAppState();
  }

  function themeSetting(theme: ThemeMode) {
    patch({ theme });
    persistAppState();
  }

  async function toggleNotification(enabled: boolean) {
    if (!enabled) {
      patch({ notificationEnabled: false });
      persistAppState();
      showToast({ title: getText('notificationOff'), tone: 'info' });
      return;
    }

    const current = notificationService.getPermission();
    setNotificationPermission(current);

    if (current === 'unsupported') {
      patch({ notificationEnabled: false });
      persistAppState();
      showToast({
        title: getText('notificationUnsupported'),
        description: getText('notificationFallback'),
        tone: 'warning',
      });
      return;
    }

    if (current === 'denied') {
      patch({ notificationEnabled: false });
      persistAppState();
      showToast({
        title: getText('notificationBlocked'),
        description: getText('notificationBlockedDescription'),
        tone: 'warning',
      });
      return;
    }

    let permission: NotificationPermission | 'unsupported';
    try {
      permission =
        current === 'granted'
          ? current
          : await notificationService.requestPermission();
    } catch (error) {
      console.warn('[FocusFlow] Notification permission request failed.', error);
      patch({ notificationEnabled: false });
      persistAppState();
      showToast({
        title: getText('notificationFailed'),
        description: getText('notificationFallback'),
        tone: 'error',
      });
      return;
    }

    setNotificationPermission(permission);

    if (permission === 'granted') {
      patch({ notificationEnabled: true });
      persistAppState();
      showToast({
        title: getText('notificationEnabled'),
        description: getText('notificationEnabledDescription'),
        tone: 'success',
      });
      return;
    }

    patch({ notificationEnabled: false });
    persistAppState();
    showToast({
      title: getText('notificationNotGranted'),
      description: getText('notificationFallback'),
      tone: 'warning',
    });
  }

  function handleResetAllData() {
    const success = resetAppData();
    setConfirmReset(false);
    setResetError(!success);

    showToast(
      success
        ? {
            title: getText('resetSuccess'),
            description: getText('resetSuccessDescription'),
            tone: 'success',
          }
        : {
            title: getText('resetFailed'),
            description: getText('resetFailedDescription'),
            tone: 'error',
          },
    );
  }

  const notificationStatus = t(`permission.${notificationPermission}`);

  return (
    <section
      className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      aria-labelledby="settings-heading"
    >
      <h2 id="settings-heading" className="mb-4 text-lg font-semibold">
        {t('settings')}
      </h2>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t('duration')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label={t('focusDuration')}
            value={settings.focusMinutes}
            min={1}
            max={120}
            onChange={(v) => numberSetting('focusMinutes', v)}
          />
          <NumberField
            label={t('shortBreakDuration')}
            value={settings.shortBreakMinutes}
            min={1}
            max={60}
            onChange={(v) => numberSetting('shortBreakMinutes', v)}
          />
          <NumberField
            label={t('longBreakDuration')}
            value={settings.longBreakMinutes}
            min={1}
            max={120}
            onChange={(v) => numberSetting('longBreakMinutes', v)}
          />
          <NumberField
            label={t('longBreakInterval')}
            value={settings.longBreakInterval}
            min={1}
            max={12}
            onChange={(v) => numberSetting('longBreakInterval', v)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">{t('behavior')}</legend>
        <div className="grid gap-3 text-sm">
          <CheckSetting
            label={t('autoStartBreak')}
            checked={settings.autoStartBreak}
            onChange={(value) => booleanSetting('autoStartBreak', value)}
          />
          <CheckSetting
            label={t('autoStartFocus')}
            checked={settings.autoStartFocus}
            onChange={(value) => booleanSetting('autoStartFocus', value)}
          />
          <CheckSetting
            label={t('sound')}
            checked={settings.soundEnabled}
            onChange={(value) => booleanSetting('soundEnabled', value)}
          />
          <CheckSetting
            label={t('notification')}
            checked={settings.notificationEnabled && notificationPermission === 'granted'}
            disabled={notificationPermission === 'unsupported'}
            description={notificationStatus}
            onChange={(value) => void toggleNotification(value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">{t('appearance')}</legend>
        <label className="grid gap-1 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">{t('theme')}</span>
          <select
            value={settings.theme}
            onChange={(event) => themeSetting(event.target.value as ThemeMode)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
          >
            <option value="system">{t('system')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </label>
      </fieldset>

      <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">{t('resetAll')}</div>
            <div className="mt-1 text-xs leading-5 text-neutral-400">
              {t('resetAllSummary')}
            </div>
          </div>
          <Button variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => setConfirmReset(true)}>
            {t('reset')}
          </Button>
        </div>
        {resetError ? (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {t('resetError')}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t('resetAllTitle')}
        description={t('resetAllDescription')}
        confirmLabel={t('resetAll')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleResetAllData}
      />
    </section>
  );
}

function CheckSetting({
  label,
  checked,
  onChange,
  disabled = false,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-1">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? (
          <span className="block text-xs text-neutral-400">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:accent-white dark:focus-visible:ring-white"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(Math.min(max, Math.max(min, Math.trunc(Number(event.target.value)) || min)))
        }
        className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
      />
    </label>
  );
}
