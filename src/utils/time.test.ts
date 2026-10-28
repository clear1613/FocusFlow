import { describe, expect, it } from 'vitest';
import { formatSeconds, getRemainingSeconds } from './time';

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
