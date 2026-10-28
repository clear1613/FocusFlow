import { describe, expect, it } from 'vitest';
import { formatFocusDuration, formatSeconds, getRemainingSeconds } from './time';

describe('time utils', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatSeconds(1500)).toBe('25:00');
    expect(formatSeconds(5)).toBe('00:05');
  });

  it('calculates remaining time from timestamp', () => {
    expect(getRemainingSeconds(300_000, 180_000)).toBe(120);
  });

  it('never returns negative remaining time', () => {
    expect(getRemainingSeconds(1000, 2000)).toBe(0);
  });
});

describe('formatFocusDuration', () => {
  it('reads minutes without hours', () => {
    expect(formatFocusDuration(25, 'zh-CN')).toBe('25 分钟');
    expect(formatFocusDuration(25, 'en')).toBe('25 min');
  });

  it('splits hours and minutes the way a person would say them', () => {
    expect(formatFocusDuration(100, 'zh-CN')).toBe('1 小时 40 分钟');
    expect(formatFocusDuration(100, 'en')).toBe('1 h 40 min');
  });

  it('drops the empty part instead of printing zeroes', () => {
    expect(formatFocusDuration(120, 'zh-CN')).toBe('2 小时');
    expect(formatFocusDuration(120, 'en')).toBe('2 h');
    expect(formatFocusDuration(0, 'zh-CN')).toBe('0 分钟');
  });
});
