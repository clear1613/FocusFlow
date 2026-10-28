import type {
  AppSettings,
  FocusSession,
  PersistedAppData,
  Task,
  TimerMode,
  TimerState,
  TimerStatus,
} from '../types';
import { STORAGE_VERSION } from '../constants/defaults';

export interface ValidationSuccess {
  ok: true;
  data: PersistedAppData;
  errors: [];
}

export interface ValidationFailure {
  ok: false;
  data: null;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value > 0;
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isNullableId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0);
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'focus' || value === 'short_break' || value === 'long_break';
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return (
    value === 'idle' ||
    value === 'running' ||
    value === 'paused' ||
    value === 'completed'
  );
}

function validateTask(value: unknown, path: string, errors: string[]): value is Task {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  let valid = true;
  const fail = (message: string) => {
    errors.push(`${path}.${message}`);
    valid = false;
  };

  if (typeof value.id !== 'string' || value.id.length === 0) fail('id must be a non-empty string');
  if (
    typeof value.title !== 'string' ||
    value.title.trim().length === 0 ||
    value.title.length > 80
  ) {
    fail('title must contain 1-80 characters');
  }
  if (!isPositiveInteger(value.estimatedPomodoros) || value.estimatedPomodoros > 99) {
    fail('estimatedPomodoros must be an integer from 1 to 99');
  }
  if (!isNonNegativeInteger(value.completedPomodoros)) {
    fail('completedPomodoros must be a non-negative integer');
  }
  if (value.status !== 'todo' && value.status !== 'completed') {
    fail('status must be todo or completed');
  }
  if (!isNonNegativeInteger(value.createdAt)) fail('createdAt must be a non-negative timestamp');
  if (!isNullableTimestamp(value.completedAt)) fail('completedAt must be a timestamp or null');

  if (value.status === 'completed' && value.completedAt === null) {
    fail('completedAt must exist when status is completed');
  }
  if (value.status === 'todo' && value.completedAt !== null) {
    fail('completedAt must be null when status is todo');
  }

  return valid;
}

function validateSession(
  value: unknown,
  path: string,
  errors: string[],
): value is FocusSession {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  let valid = true;
  const fail = (message: string) => {
    errors.push(`${path}.${message}`);
    valid = false;
  };

  if (typeof value.id !== 'string' || value.id.length === 0) fail('id must be a non-empty string');
  if (!isNullableId(value.taskId)) fail('taskId must be a non-empty string or null');
  if (!isTimerMode(value.type)) fail('type is invalid');
  if (
    value.status !== 'running' &&
    value.status !== 'completed' &&
    value.status !== 'cancelled' &&
    value.status !== 'skipped'
  ) {
    fail('status is invalid');
  }
  if (!isNonNegativeInteger(value.startedAt)) fail('startedAt must be a non-negative timestamp');
  if (!isNullableTimestamp(value.endedAt)) fail('endedAt must be a timestamp or null');
  if (
    !isPositiveInteger(value.plannedDurationSeconds) ||
    value.plannedDurationSeconds > 24 * 60 * 60
  ) {
    fail('plannedDurationSeconds must be a positive integer <= 86400');
  }
  if (
    !isNonNegativeInteger(value.actualDurationSeconds) ||
    value.actualDurationSeconds > 24 * 60 * 60
  ) {
    fail('actualDurationSeconds must be a non-negative integer <= 86400');
  }
  if (!isNullableTimestamp(value.completedAt)) fail('completedAt must be a timestamp or null');

  if (
    isNonNegativeInteger(value.startedAt) &&
    isNonNegativeInteger(value.endedAt) &&
    value.endedAt < value.startedAt
  ) {
    fail('endedAt cannot be before startedAt');
  }

  if (value.status === 'running') {
    if (value.endedAt !== null) fail('endedAt must be null while running');
    if (value.completedAt !== null) fail('completedAt must be null while running');
  }

  if (value.status === 'completed') {
    if (value.endedAt === null) fail('endedAt must exist when completed');
    if (value.completedAt === null) fail('completedAt must exist when completed');
  } else if (value.completedAt !== null) {
    fail('completedAt must be null unless status is completed');
  }

  if ((value.status === 'cancelled' || value.status === 'skipped') && value.endedAt === null) {
    fail('endedAt must exist when cancelled or skipped');
  }

  return valid;
}

function validateTimer(
  value: unknown,
  path: string,
  errors: string[],
): value is TimerState {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  let valid = true;
  const fail = (message: string) => {
    errors.push(`${path}.${message}`);
    valid = false;
  };

  if (!isTimerMode(value.mode)) fail('mode is invalid');
  if (!isTimerStatus(value.status)) fail('status is invalid');
  if (!isNonNegativeInteger(value.remainingSeconds)) fail('remainingSeconds must be a non-negative integer');
  if (!isPositiveInteger(value.plannedDurationSeconds)) fail('plannedDurationSeconds must be a positive integer');
  if (!isNullableTimestamp(value.startedAt)) fail('startedAt must be a timestamp or null');
  if (!isNullableTimestamp(value.endAt)) fail('endAt must be a timestamp or null');
  if (!isNullableId(value.activeSessionId)) fail('activeSessionId must be a non-empty string or null');
  if (!isNonNegativeInteger(value.completedFocusCountInCycle)) {
    fail('completedFocusCountInCycle must be a non-negative integer');
  }

  return valid;
}

function validateSettings(
  value: unknown,
  path: string,
  errors: string[],
): value is AppSettings {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  let valid = true;
  const fail = (message: string) => {
    errors.push(`${path}.${message}`);
    valid = false;
  };

  if (!isPositiveInteger(value.focusMinutes) || value.focusMinutes > 120) {
    fail('focusMinutes must be an integer from 1 to 120');
  }
  if (!isPositiveInteger(value.shortBreakMinutes) || value.shortBreakMinutes > 60) {
    fail('shortBreakMinutes must be an integer from 1 to 60');
  }
  if (!isPositiveInteger(value.longBreakMinutes) || value.longBreakMinutes > 120) {
    fail('longBreakMinutes must be an integer from 1 to 120');
  }
  if (!isPositiveInteger(value.longBreakInterval) || value.longBreakInterval > 12) {
    fail('longBreakInterval must be an integer from 1 to 12');
  }

  for (const key of [
    'autoStartBreak',
    'autoStartFocus',
    'soundEnabled',
    'notificationEnabled',
  ] as const) {
    if (typeof value[key] !== 'boolean') fail(`${key} must be boolean`);
  }

  if (value.theme !== 'system' && value.theme !== 'light' && value.theme !== 'dark') {
    fail('theme is invalid');
  }
  if (value.locale !== 'zh-CN' && value.locale !== 'en') {
    fail('locale is invalid');
  }

  return valid;
}

export function validatePersistedAppData(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, data: null, errors: ['root must be an object'] };
  }

  if (value.version !== STORAGE_VERSION) {
    errors.push(`version must equal ${STORAGE_VERSION}`);
  }

  if (!Array.isArray(value.tasks)) {
    errors.push('tasks must be an array');
  } else {
    const ids = new Set<string>();
    value.tasks.forEach((task, index) => {
      if (validateTask(task, `tasks[${index}]`, errors)) {
        if (ids.has(task.id)) errors.push(`tasks[${index}].id must be unique`);
        ids.add(task.id);
      }
    });
  }

  if (!Array.isArray(value.sessions)) {
    errors.push('sessions must be an array');
  } else {
    const ids = new Set<string>();
    value.sessions.forEach((session, index) => {
      if (validateSession(session, `sessions[${index}]`, errors)) {
        if (ids.has(session.id)) errors.push(`sessions[${index}].id must be unique`);
        ids.add(session.id);
      }
    });
  }

  if (!isNullableId(value.activeTaskId)) {
    errors.push('activeTaskId must be a non-empty string or null');
  }

  validateTimer(value.timer, 'timer', errors);
  validateSettings(value.settings, 'settings', errors);

  if (
    typeof value.activeTaskId === 'string' &&
    Array.isArray(value.tasks) &&
    !value.tasks.some(
      (task) =>
        isRecord(task) && task.id === value.activeTaskId && task.status === 'todo',
    )
  ) {
    errors.push('activeTaskId must reference an existing todo task');
  }

  if (errors.length > 0) {
    return { ok: false, data: null, errors };
  }

  return { ok: true, data: value as unknown as PersistedAppData, errors: [] };
}
