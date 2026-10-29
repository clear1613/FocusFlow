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
import { BackupPanel } from './BackupPanel';

type DurationKey = 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes';
type NumberSettingKey = DurationKey | 'longBreakInterval';

const durationModeByKey: Record<DurationKey, 'focus' | 'short_break' | 'long_break'> = {
  focusMinutes: 'focus',
  shortBreakMinutes: 'short_break',
  longBreakMinutes: 'long_break',
};

/**
 * Settings body. Rendered inside `SettingsDialog`, so it owns no card chrome —
 * the dialog supplies the title, scroll container and close affordance.
 */
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
    <>
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {t('duration')}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
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

      <fieldset className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {t('behavior')}
        </legend>
        <div className="grid gap-1">
          <SwitchSetting
            label={t('autoStartBreak')}
            checked={settings.autoStartBreak}
            onChange={(value) => booleanSetting('autoStartBreak', value)}
          />
          <SwitchSetting
            label={t('autoStartFocus')}
            checked={settings.autoStartFocus}
            onChange={(value) => booleanSetting('autoStartFocus', value)}
          />
          <SwitchSetting
            label={t('sound')}
            checked={settings.soundEnabled}
            onChange={(value) => booleanSetting('soundEnabled', value)}
          />
          <SwitchSetting
            label={t('notification')}
            checked={settings.notificationEnabled && notificationPermission === 'granted'}
            disabled={notificationPermission === 'unsupported'}
            description={notificationStatus}
            onChange={(value) => void toggleNotification(value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {t('appearance')}
        </legend>
        <label className="flex min-h-11 items-center justify-between gap-4">
          <span className="text-sm">{t('theme')}</span>
          <select
            value={settings.theme}
            onChange={(event) => themeSetting(event.target.value as ThemeMode)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
          >
            <option value="system">{t('system')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </label>
      </fieldset>

      <BackupPanel />

      <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
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
    </>
  );
}

/**
 * A labelled switch. The native checkbox stays behind the scenes so keyboard
 * behaviour, form semantics and `aria-checked` all keep working.
 */
function SwitchSetting({
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
    <label className={`flex min-h-11 items-center justify-between gap-4 rounded-xl px-1 ${disabled ? 'opacity-60' : ''}`}>
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {description ? (
          <span className="block text-xs text-neutral-400">{description}</span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-white dark:peer-focus-visible:ring-offset-neutral-900 ${
            checked
              ? 'bg-neutral-900 dark:bg-white'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        />
        <span
          aria-hidden="true"
          className={`relative h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-neutral-900 ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
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
  const { t } = useI18n();
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(Math.min(max, Math.max(min, Math.trunc(Number(event.target.value)) || min)))
          }
          className="min-h-11 w-20 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-right tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:focus-visible:ring-white"
        />
        <span className="w-8 text-xs text-neutral-400">{t('minuteShort')}</span>
      </span>
    </label>
  );
}
