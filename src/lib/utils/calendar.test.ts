import { describe, it, expect } from 'vitest';
import {
  getMonthDays,
  formatMonthYear,
  formatDateShort,
  formatDateLong,
  isToday,
  isSameMonth,
  parseDateIso,
  getWeekdayNames,
  navigateMonth,
} from './calendar';

describe('calendar utilities', () => {
  describe('getMonthDays', () => {
    it('returns 42 days (6 weeks) for consistent grid', () => {
      const days = getMonthDays(2026, 2); // March 2026
      expect(days).toHaveLength(42);
    });

    it('includes correct number of days in target month', () => {
      // February 2026 has 28 days (not a leap year)
      const feb2026 = getMonthDays(2026, 1);
      const febDays = feb2026.filter((d) => d.isCurrentMonth);
      expect(febDays).toHaveLength(28);

      // March 2026 has 31 days
      const mar2026 = getMonthDays(2026, 2);
      const marDays = mar2026.filter((d) => d.isCurrentMonth);
      expect(marDays).toHaveLength(31);
    });

    it('includes padding days from adjacent months', () => {
      const days = getMonthDays(2026, 2); // March 2026
      const paddingDays = days.filter((d) => !d.isCurrentMonth);
      expect(paddingDays.length).toBeGreaterThan(0);
    });

    it('marks padding days as not current month', () => {
      const days = getMonthDays(2026, 2); // March 2026 starts on Sunday
      // First days should be from February
      const firstDay = days[0];
      expect(firstDay.isCurrentMonth).toBe(false);
    });

    it('correctly handles leap year February', () => {
      const feb2024 = getMonthDays(2024, 1); // Leap year
      const febDays = feb2024.filter((d) => d.isCurrentMonth);
      expect(febDays).toHaveLength(29);
    });
  });

  describe('formatMonthYear', () => {
    it('formats month and year in Czech', () => {
      const result = formatMonthYear(2026, 2); // March 2026
      // Should be something like "březen 2026"
      expect(result).toContain('2026');
      expect(result.toLowerCase()).toContain('březen');
    });
  });

  describe('formatDateShort', () => {
    it('formats date in Czech short format', () => {
      expect(formatDateShort('2026-03-15')).toBe('15. 3.');
      expect(formatDateShort('2026-12-01')).toBe('1. 12.');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      const today = new Date();
      const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(isToday(isoDate)).toBe(true);
    });

    it('returns false for other dates', () => {
      expect(isToday('2020-01-01')).toBe(false);
    });
  });

  describe('isSameMonth', () => {
    it('returns true for matching month', () => {
      // Month is 0-indexed in JS
      expect(isSameMonth('2026-03-15', 2026, 2)).toBe(true);
    });

    it('returns false for different month', () => {
      expect(isSameMonth('2026-03-15', 2026, 3)).toBe(false);
    });

    it('returns false for different year', () => {
      expect(isSameMonth('2025-03-15', 2026, 2)).toBe(false);
    });
  });

  describe('parseDateIso', () => {
    it('parses ISO date string correctly', () => {
      const result = parseDateIso('2026-03-15');
      expect(result.year).toBe(2026);
      expect(result.month).toBe(2); // 0-indexed
      expect(result.day).toBe(15);
    });
  });

  describe('getWeekdayNames', () => {
    it('returns Czech weekday abbreviations starting with Monday', () => {
      const names = getWeekdayNames();
      expect(names).toHaveLength(7);
      expect(names[0]).toBe('Po'); // Monday
      expect(names[6]).toBe('Ne'); // Sunday
    });
  });

  describe('navigateMonth', () => {
    it('moves forward one month', () => {
      const result = navigateMonth(2026, 2, 1); // March + 1
      expect(result.year).toBe(2026);
      expect(result.month).toBe(3); // April
    });

    it('moves backward one month', () => {
      const result = navigateMonth(2026, 2, -1); // March - 1
      expect(result.year).toBe(2026);
      expect(result.month).toBe(1); // February
    });

    it('handles year rollover forward', () => {
      const result = navigateMonth(2026, 11, 1); // December + 1
      expect(result.year).toBe(2027);
      expect(result.month).toBe(0); // January
    });

    it('handles year rollover backward', () => {
      const result = navigateMonth(2026, 0, -1); // January - 1
      expect(result.year).toBe(2025);
      expect(result.month).toBe(11); // December
    });

    it('handles multiple month jumps', () => {
      const result = navigateMonth(2026, 2, 14); // March + 14 months
      expect(result.year).toBe(2027);
      expect(result.month).toBe(4); // May
    });
  });
});
