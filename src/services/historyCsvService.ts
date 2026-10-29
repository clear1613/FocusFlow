import { format } from 'date-fns';
import type { AppLocale } from '../types';
import type { HistoryRecord } from '../types/history';
import { translate } from './i18n';

export function getHistoryTaskLabel(record: HistoryRecord, locale: AppLocale): string {
  return record.taskTitle ?? translate(locale, record.taskId === null ? 'history.unassigned' : 'history.deleted');
}

function cell(value: string | number): string {
  let text = String(value);
  // Quoting protects CSV syntax, but spreadsheets still evaluate formula text.
  // Prefix suspicious text even when whitespace/control characters precede it.
  if (/^[\t\r\n]/.test(text) || /^[=+\-@]/.test(text.replace(/^[\s\p{Cc}]*/u, ''))) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function createHistoryCsv(records: HistoryRecord[], locale: AppLocale): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const headings = ['history.csv.date', 'history.csv.task', 'history.csv.start', 'history.csv.end', 'history.csv.status', 'history.csv.actual', 'history.csv.planned'] as const;
  const rows: (string | number)[][] = [headings.map(t)];
  for (const record of records) {
    rows.push([record.dateKey, getHistoryTaskLabel(record, locale), format(new Date(record.startedAt), "yyyy-MM-dd'T'HH:mm:ssxxx"), format(new Date(record.at), "yyyy-MM-dd'T'HH:mm:ssxxx"), t(`history.status.${record.status}`), record.actualDurationSeconds, record.plannedDurationSeconds]);
  }
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
