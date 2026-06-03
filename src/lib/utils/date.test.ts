import { describe, it, expect } from 'vitest';
import { daysBetween, resolveRouteDate, formatWeekdayShortCs, formatWeekdayLongCs } from './date';

describe('daysBetween', () => {
  it('same day returns 1 (inclusive convention)', () => {
    expect(daysBetween('2026-05-01', '2026-05-01')).toBe(1);
  });

  it('consecutive days return 2', () => {
    expect(daysBetween('2026-05-01', '2026-05-02')).toBe(2);
  });

  it('ten-day span returns 10', () => {
    expect(daysBetween('2026-05-01', '2026-05-10')).toBe(10);
  });

  it('month boundary spans correctly', () => {
    // May 27 → May 31: 5 days inclusive
    expect(daysBetween('2026-05-27', '2026-05-31')).toBe(5);
  });

  it('is not affected by DST clock-change dates', () => {
    // CET→CEST transition: 2026-03-29 (clocks spring forward at 02:00)
    // 7-day span crossing the DST boundary must still return 7
    expect(daysBetween('2026-03-26', '2026-04-01')).toBe(7);
  });
});

describe('resolveRouteDate', () => {
  const protocolStart = '2025-06-01';
  const today = '2025-06-10';

  it('returns the param unchanged when it is a valid in-range date', () => {
    const result = resolveRouteDate('2025-06-05', protocolStart, today);
    expect(result).toEqual({ type: 'date', date: '2025-06-05' });
  });

  it('returns redirect sentinel for a malformed string', () => {
    const result = resolveRouteDate('not-a-date', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for an empty string', () => {
    const result = resolveRouteDate('', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for a future date', () => {
    const result = resolveRouteDate('2025-12-31', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for a date before protocolStart', () => {
    const result = resolveRouteDate('2025-05-15', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('accepts today as a valid date', () => {
    const result = resolveRouteDate(today, protocolStart, today);
    expect(result).toEqual({ type: 'date', date: today });
  });

  it('accepts protocolStart as a valid date', () => {
    const result = resolveRouteDate(protocolStart, protocolStart, today);
    expect(result).toEqual({ type: 'date', date: protocolStart });
  });

  it('rejects date with wrong format (missing day)', () => {
    const result = resolveRouteDate('2025-06', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });
});

describe('formatWeekdayShortCs', () => {
  // 2025-06-02 is a Monday; 2025-06-07 is a Saturday; 2025-06-08 is a Sunday
  it('returns Czech abbreviated weekday for Monday', () => {
    expect(formatWeekdayShortCs('2025-06-02')).toBe('po');
  });

  it('returns Czech abbreviated weekday for Saturday', () => {
    expect(formatWeekdayShortCs('2025-06-07')).toBe('so');
  });

  it('returns Czech abbreviated weekday for Sunday', () => {
    expect(formatWeekdayShortCs('2025-06-08')).toBe('ne');
  });
});

describe('formatWeekdayLongCs', () => {
  it('returns Czech full weekday name for Monday', () => {
    expect(formatWeekdayLongCs('2025-06-02')).toBe('pondělí');
  });

  it('returns Czech full weekday name for Saturday', () => {
    expect(formatWeekdayLongCs('2025-06-07')).toBe('sobota');
  });

  it('returns Czech full weekday name for Sunday', () => {
    expect(formatWeekdayLongCs('2025-06-08')).toBe('neděle');
  });
});
