import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import type { Task } from '../../types';

/**
 * One task row.
 *
 * Actions live behind a single `⋯` menu so the row reads as a sentence instead
 * of a CRUD toolbar: circle = done, row = select as current task, menu = edit,
 * mark done, delete. The completion circle is the only always-visible action
 * because it is the one a user reaches for most often.
 */
export function TaskRow({
  task,
  active,
  canSelect,
  onSelect,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: Task;
  active: boolean;
  canSelect: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onComplete?: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const completed = task.status === 'completed';

  /**
   * Run a menu action and put focus back on the `⋯` button first.
   *
   * Opening a dialog from a menu item would otherwise leave focus on a node that
   * disappears with the menu, so the dialog would restore focus to `body` when
   * it closes. Focusing the trigger before the menu unmounts keeps the keyboard
   * path intact.
   */
  function runAction(action: () => void) {
    menuButtonRef.current?.focus();
    setMenuOpen(false);
    action();
  }

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        active
          ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800/60'
          : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
      } ${completed ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        aria-label={t('task.markDoneFor', { title: task.title })}
        aria-pressed={completed}
        disabled={!onComplete}
        onClick={onComplete}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-default dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900 ${
          completed
            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
            : 'border-neutral-300 bg-transparent text-transparent hover:border-neutral-900 hover:text-neutral-500 dark:border-neutral-600 dark:hover:border-white'
        }`}
      >
        ✓
      </button>

      <button
        type="button"
        disabled={!canSelect}
        onClick={onSelect}
        className="min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-default dark:focus-visible:ring-white"
      >
        <span
          className={`block truncate font-medium ${completed ? 'line-through' : ''}`}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
          <span>{t('taskProgress', { done: task.completedPomodoros, total: task.estimatedPomodoros })}</span>
          {active ? (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-neutral-900">
              {t('task.current')}
            </span>
          ) : null}
        </span>
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          ref={menuButtonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('task.moreFor', { title: task.title })}
          onClick={() => setMenuOpen((open) => !open)}
          className="grid h-9 w-9 place-items-center rounded-xl text-lg leading-none text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:ring-white"
        >
          ⋯
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            <MenuItem onClick={() => runAction(onEdit)}>{t('edit')}</MenuItem>
            {onComplete ? (
              <MenuItem onClick={() => runAction(onComplete)}>{t('task.markDone')}</MenuItem>
            ) : null}
            <MenuItem danger onClick={() => runAction(onDelete)}>
              {t('delete')}
            </MenuItem>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800 ${
        danger ? 'text-red-600 dark:text-red-400' : ''
      }`}
    >
      {children}
    </button>
  );
}
