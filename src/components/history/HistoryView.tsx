import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { useLocalDay } from '../../hooks/useLocalDay';
import { createHistoryCsv, getHistoryTaskLabel } from '../../services/historyCsvService';
import { getDefaultHistoryFilters, queryHistory } from '../../services/historyService';
import { useSessionStore } from '../../stores/sessionStore';
import { useTaskStore } from '../../stores/taskStore';
import type { HistoryFilters, HistoryRange, HistoryStatus, HistoryTaskFilter } from '../../types/history';
import { Button } from '../common/Button';

const PAGE_SIZE = 20;
const fieldClass = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus-visible:ring-white dark:[color-scheme:dark]';

export function HistoryView() {
  const { locale, t } = useI18n();
  const sessions = useSessionStore(s => s.sessions);
  const tasks = useTaskStore(s => s.tasks);
  const day = useLocalDay();
  const [filters, setFilters] = useState(() => getDefaultHistoryFilters());
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const errorId = useId();
  useEffect(() => { heading.current?.focus(); }, []);

  const result = useMemo(() => {
    const task = filters.task.startsWith('task:') && !tasks.some(item => `task:${item.id}` === filters.task) ? 'all' : filters.task;
    return queryHistory(sessions, tasks, { ...filters, task }, new Date(day));
  }, [sessions, tasks, filters, day]);
  const selectedTask = filters.task.startsWith('task:') && !tasks.some(item => `task:${item.id}` === filters.task) ? 'all' : filters.task;
  const pageCount = Math.max(1, Math.ceil(result.records.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleIds = new Set(result.records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => item.id));
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });
  const timeFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const hasHistory = sessions.some(item => item.type === 'focus' && item.status !== 'running');

  function change<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
    setPage(1);
    setDownloadError(false);
  }

  function download() {
    if (result.error || result.records.length === 0) return;
    setDownloadError(false);
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob([createHistoryCsv(result.records, locale)], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `focusflow-history-${result.from}-${result.to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch { setDownloadError(true); }
    finally {
      if (url) {
        const captured = url;
        window.setTimeout(() => URL.revokeObjectURL(captured), 1000);
      }
    }
  }

  return (
    <section aria-labelledby={headingId} className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id={headingId} ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">{t('history.title')}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{t('history.description')}</p>
        </div>
        <div className="max-w-full sm:max-w-56">
          <Button variant="secondary" onClick={download} disabled={Boolean(result.error) || !result.records.length} className="flex items-center gap-2 text-sm">
            <Download size={16} aria-hidden="true" />{t('history.export')}
          </Button>
          <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{t('history.exportHint')}</p>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3">
        <label className="col-span-2 min-w-0 text-sm font-medium sm:col-span-1">{t('history.range')}
          <select className={fieldClass} value={filters.range} onChange={event => change('range', event.target.value as HistoryRange)}>
            {(['today', '7d', '30d', 'custom'] as const).map(range => <option key={range} value={range}>{t(`history.range.${range}`)}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium">{t('history.task')}
          <select className={fieldClass} value={selectedTask} onChange={event => change('task', event.target.value as HistoryTaskFilter)}>
            <option value="all">{t('history.allTasks')}</option>
            <option value="unassigned">{t('history.unassigned')}</option>
            <option value="deleted">{t('history.deleted')}</option>
            {tasks.map(task => <option key={task.id} value={`task:${task.id}`}>{task.title}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium">{t('history.status')}
          <select className={fieldClass} value={filters.status} onChange={event => change('status', event.target.value as HistoryStatus | 'all')}>
            <option value="all">{t('history.allStatuses')}</option>
            {(['completed', 'cancelled', 'skipped'] as const).map(status => <option key={status} value={status}>{t(`history.status.${status}`)}</option>)}
          </select>
        </label>
      </div>
      {filters.range === 'custom' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-medium">{t('history.from')}
            <input type="date" className={fieldClass} value={filters.from} aria-invalid={Boolean(result.error)} aria-describedby={result.error ? errorId : undefined} onChange={event => change('from', event.target.value)} />
          </label>
          <label className="min-w-0 text-sm font-medium">{t('history.to')}
            <input type="date" className={fieldClass} value={filters.to} aria-invalid={Boolean(result.error)} aria-describedby={result.error ? errorId : undefined} onChange={event => change('to', event.target.value)} />
          </label>
        </div>
      ) : null}
      {result.error ? <p id={errorId} role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{t(`history.${result.error}`)}</p> : null}
      {downloadError ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{t('history.exportError')}</p> : null}

      <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-baseline justify-between gap-2" role="status">
          <p className="text-lg font-semibold tracking-tight">{t('history.summary', { count: result.summary.completedCount, minutes: result.summary.focusMinutes })}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('history.resultCount', { count: result.records.length })}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{t('history.summaryHint')}</p>
      </div>
      {!result.error && !result.records.length ? (
        <div className="py-12 text-center">
          <p className="font-medium">{t(hasHistory ? 'history.filteredEmpty' : 'history.emptyTitle')}</p>
          {!hasHistory ? <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('history.emptyHint')}</p> : null}
        </div>
      ) : null}

      {result.days.map(group => {
        const records = group.records.filter(record => visibleIds.has(record.id));
        if (!records.length) return null;
        return (
          <section key={group.dateKey} className="mt-7" aria-label={dateFormat.format(group.dayStart)}>
            <h3 className="text-sm font-semibold">{dateFormat.format(group.dayStart)}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{t('history.dailySummary', { count: group.summary.completedCount, minutes: group.summary.focusMinutes })}</p>
            <ol className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
              {records.map(record => (
                <li key={record.id}>
                  <article className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words font-medium [overflow-wrap:anywhere]">{getHistoryTaskLabel(record, locale)}</p>
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                        <div><dt className="inline">{t('history.started')} </dt><dd className="inline"><time dateTime={new Date(record.startedAt).toISOString()}>{timeFormat.format(record.startedAt)}</time></dd></div>
                        <div><dt className="inline">{t('history.ended')} </dt><dd className="inline"><time dateTime={new Date(record.at).toISOString()}>{timeFormat.format(record.at)}</time></dd></div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>{t(`history.status.${record.status}`)}</span>
                      <span className="text-sm tabular-nums" title={t('history.actual')}>{t(record.actualDurationSeconds % 60 ? 'history.durationSeconds' : 'history.durationMinutes', { minutes: Math.floor(record.actualDurationSeconds / 60), seconds: record.actualDurationSeconds % 60 })}</span>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {pageCount > 1 ? (
        <nav aria-label={t('history.pagination')} className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="text-sm">{t('history.previous')}</Button>
          <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{t('history.page', { page: currentPage, pages: pageCount })}</p>
          <Button variant="ghost" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="text-sm">{t('history.next')}</Button>
        </nav>
      ) : null}
    </section>
  );
}
