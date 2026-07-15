import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  daysBetween,
  resolveRouteDate,
  formatWeekdayShortCs,
  formatWeekdayLongCs,
  todayIso,
  daysAgo,
  addDays,
  formatObservationTime,
} from './date';

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

  it('returns preview for a future date within range', () => {
    const result = resolveRouteDate('2025-12-31', protocolStart, today);
    expect(result).toEqual({ type: 'preview', date: '2025-12-31' });
  });

  it('returns preview for the day immediately after today', () => {
    const result = resolveRouteDate('2025-06-11', protocolStart, today);
    expect(result).toEqual({ type: 'preview', date: '2025-06-11' });
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

describe('todayIso', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives the date from local-clock components, not toISOString()', () => {
    // Construct a Date whose UTC date differs from its local date when run in a
    // non-UTC zone. We assert against the LOCAL fields directly so the test is
    // valid in any zone — including UTC, where the two happen to coincide.
    const fixed = new Date(2026, 5, 15, 1, 30, 0); // local 2026-06-15 01:30
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
    const expected = `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, '0')}-${String(fixed.getDate()).padStart(2, '0')}`;
    expect(todayIso()).toBe(expected);
  });

  it('does not call Date.prototype.toISOString (local-zone-correct path)', () => {
    // todayIso() must not depend on UTC slicing. If it ever calls toISOString,
    // the test fails — guarding the regression that motivated this fix.
    const spy = vi.spyOn(Date.prototype, 'toISOString');
    todayIso();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('daysAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local-zone date n days ago, not toISOString-derived', () => {
    const fixed = new Date(2026, 5, 15, 1, 30, 0);
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
    const today = `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, '0')}-${String(fixed.getDate()).padStart(2, '0')}`;
    expect(daysAgo(0)).toBe(today);

    const minus7 = new Date(fixed);
    minus7.setDate(minus7.getDate() - 7);
    const expected7 = `${minus7.getFullYear()}-${String(minus7.getMonth() + 1).padStart(2, '0')}-${String(minus7.getDate()).padStart(2, '0')}`;
    expect(daysAgo(7)).toBe(expected7);
  });

  it('does not call Date.prototype.toISOString', () => {
    const spy = vi.spyOn(Date.prototype, 'toISOString');
    daysAgo(3);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-06-15', 3)).toBe('2026-06-18');
  });

  it('adds negative days', () => {
    expect(addDays('2026-06-15', -3)).toBe('2026-06-12');
  });

  it('handles month boundary forward', () => {
    expect(addDays('2026-06-30', 2)).toBe('2026-07-02');
  });

  it('handles month boundary backward', () => {
    expect(addDays('2026-06-01', -1)).toBe('2026-05-31');
  });

  it('handles year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('formatObservationTime', () => {
  // Build ISO strings from local-time Date objects so the assertions match the
  // formatter's local-clock readout regardless of the test runner's timezone.
  const isoAt = (y: number, mo: number, d: number, h: number, m: number): string =>
    new Date(y, mo - 1, d, h, m).toISOString();

  it('formats a mid-morning time as H:MM with no leading zero on hour', () => {
    expect(formatObservationTime(isoAt(2026, 5, 15, 9, 12))).toBe('9:12');
  });

  it('zero-pads minutes below ten', () => {
    expect(formatObservationTime(isoAt(2026, 5, 15, 9, 5))).toBe('9:05');
  });

  it('renders midnight as 0:00', () => {
    expect(formatObservationTime(isoAt(2026, 5, 15, 0, 0))).toBe('0:00');
  });

  it('renders top-of-hour minute as :00', () => {
    expect(formatObservationTime(isoAt(2026, 5, 15, 14, 0))).toBe('14:00');
  });

  it('preserves two-digit hours', () => {
    expect(formatObservationTime(isoAt(2026, 5, 15, 23, 47))).toBe('23:47');
  });
});
