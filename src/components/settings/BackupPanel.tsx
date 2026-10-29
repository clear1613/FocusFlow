import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { exportBackup, restoreBackup } from '../../services/backupActions';
import { BackupError, inspectBackup, MAX_BACKUP_BYTES } from '../../services/backupService';
import { getText } from '../../services/i18n';
import { storageService } from '../../services/storageService';
import { showToast } from '../../stores/toastStore';
import type { BackupErrorCode, BackupPreview } from '../../types/backup';
import { Button } from '../common/Button';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new BackupError('file'));
    reader.onerror = () => reject(new BackupError('file'));
    reader.readAsText(file);
  });
}

export function BackupPanel() {
  const { locale, t } = useI18n();
  const headingId = useId();
  const input = useRef<HTMLInputElement>(null);
  const pickButton = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<BackupErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const protectedData = storageService.isWriteBlocked();

  useEffect(() => () => { request.current += 1; }, []);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const id = ++request.current;
    setPreview(null);
    setError(null);
    setBusy(true);
    try {
      if (protectedData) throw new BackupError('protected');
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('size');
      const next = inspectBackup(await readFile(file));
      if (id === request.current) setPreview(next);
    } catch (failure) {
      if (id === request.current) setError(failure instanceof BackupError ? failure.code : 'file');
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function download() {
    setError(null);
    let url: string | undefined;
    try {
      const backup = exportBackup();
      url = URL.createObjectURL(new Blob([backup.content], { type: 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backup.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (failure) {
      setError(failure instanceof BackupError ? failure.code : 'download');
    } finally {
      if (url) {
        const captured = url;
        window.setTimeout(() => URL.revokeObjectURL(captured), 1000);
      }
    }
  }

  function confirm() {
    if (!preview || busy) return;
    setError(null);
    try {
      restoreBackup(preview);
      setPreview(null);
      pickButton.current?.focus();
      showToast({ title: getText('backup.success'), description: getText('backup.successDescription'), tone: 'success' });
    } catch (failure) {
      setError(failure instanceof BackupError ? failure.code : 'storage');
    }
  }

  return (
    <section className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800" aria-label={t('backup.title')}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{t('backup.title')}</h3>
      <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{t('backup.description')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={download} disabled={busy || protectedData}>{t('backup.export')}</Button>
        <button ref={pickButton} type="button" onClick={() => input.current?.click()} disabled={busy || protectedData}
          className="min-h-11 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:focus-visible:ring-white">
          {t('backup.select')}
        </button>
        <input ref={input} type="file" accept=".json,application/json" aria-label={t('backup.file')} tabIndex={-1}
          className="hidden" onChange={(event) => void selectFile(event)} disabled={busy || protectedData} />
      </div>
      {protectedData ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t('backup.error.protected')}</p> : null}
      {busy ? <p role="status" className="mt-3 text-sm text-neutral-500">{t('backup.reading')}</p> : null}
      {error ? <p role="alert" className="mt-3 break-words text-sm leading-6 text-red-700 dark:text-red-300">{t(`backup.error.${error}`)}</p> : null}
      {preview ? (
        <section className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50" role="region" aria-labelledby={headingId}>
          <h4 id={headingId} className="text-sm font-semibold">{t('backup.preview')}</h4>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3"><dt>{t('backup.date')}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(preview.exportedAt))}</dd></div>
            <div className="flex justify-between gap-3"><dt>{t('backup.tasks')}</dt><dd>{preview.data.tasks.length}</dd></div>
            <div className="flex justify-between gap-3"><dt>{t('backup.sessions')}</dt><dd>{preview.data.sessions.length}</dd></div>
          </dl>
          {preview.pausedTimer ? <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{t('backup.paused')}</p> : null}
          <p className="mt-3 text-sm font-medium leading-6 text-amber-800 dark:text-amber-200">{t('backup.warning')}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{t('backup.notifications')}</p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => { request.current += 1; setPreview(null); setError(null); pickButton.current?.focus(); }}>{t('backup.cancel')}</Button>
            <Button onClick={confirm}>{t('backup.confirm')}</Button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
