import { describe, expect, it } from 'vitest';

import { resolveDay } from './day-view';

const today = '2025-06-10';
const futureDate = '2025-12-31';
const validDate = '2025-06-05';

describe('resolveDay', () => {
  describe('not seeded (feeding stage unset) — the layout owns the redirect to /', () => {
    it('returns today as selectedDate and no redirect, whatever the param', () => {
      const result = resolveDay('2025-06-05', false, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: null });
    });
  });

  describe('seeded, valid non-future param', () => {
    it('returns param as selectedDate with no redirect', () => {
      const result = resolveDay(validDate, true, today);
      expect(result).toEqual({ selectedDate: validDate, redirectTo: null });
    });

    it('accepts today itself as a valid date', () => {
      const result = resolveDay(today, true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: null });
    });

    it('accepts a date years in the past — the strip may not reach it, but the day still renders', () => {
      const result = resolveDay('2020-01-01', true, today);
      expect(result).toEqual({ selectedDate: '2020-01-01', redirectTo: null });
    });
  });

  describe('seeded, future date — redirects to today (no future preview)', () => {
    it('redirects a far-future date to today', () => {
      const result = resolveDay(futureDate, true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: today });
    });

    it('redirects the day immediately after today to today', () => {
      const result = resolveDay('2025-06-11', true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: today });
    });
  });

  describe('seeded, malformed param — redirects to today', () => {
    it('redirects to today for a malformed string', () => {
      const result = resolveDay('not-a-date', true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: today });
    });

    it('redirects to today for an empty string', () => {
      const result = resolveDay('', true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: today });
    });

    it('redirects to today for a partial date string', () => {
      const result = resolveDay('2025-06', true, today);
      expect(result).toEqual({ selectedDate: today, redirectTo: today });
    });
  });
});
