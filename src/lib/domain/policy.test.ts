import { describe, it, expect } from 'vitest';
import { addDays } from '$lib/utils/date';
import {
  ACCEPTED_ALLERGEN_CADENCE_DAYS,
  BUFFER_AFTER_END_DAYS,
  BUFFER_BEFORE_START_DAYS,
  cadenceForPhase,
  isWithinLoggableWindow,
  REINTRODUCTION_CADENCE_DAYS,
  SKIN_STABILITY_WINDOW_DAYS,
  stabilityWindowFor,
} from './policy';

describe('isWithinLoggableWindow', () => {
  const scheduleStart = '2026-05-01';
  const scheduleEnd = '2026-06-01';

  it('is true for a date inside the schedule span', () => {
    expect(isWithinLoggableWindow('2026-05-15', scheduleStart, scheduleEnd)).toBe(true);
  });

  it('is true exactly at the start-buffer boundary', () => {
    const boundary = addDays(scheduleStart, -BUFFER_BEFORE_START_DAYS);
    expect(isWithinLoggableWindow(boundary, scheduleStart, scheduleEnd)).toBe(true);
  });

  it('is false one day before the start-buffer boundary', () => {
    const tooEarly = addDays(scheduleStart, -BUFFER_BEFORE_START_DAYS - 1);
    expect(isWithinLoggableWindow(tooEarly, scheduleStart, scheduleEnd)).toBe(false);
  });

  it('is true exactly at the end-buffer boundary', () => {
    const boundary = addDays(scheduleEnd, BUFFER_AFTER_END_DAYS);
    expect(isWithinLoggableWindow(boundary, scheduleStart, scheduleEnd)).toBe(true);
  });

  it('is false one day after the end-buffer boundary', () => {
    const tooLate = addDays(scheduleEnd, BUFFER_AFTER_END_DAYS + 1);
    expect(isWithinLoggableWindow(tooLate, scheduleStart, scheduleEnd)).toBe(false);
  });
});

describe('cadenceForPhase', () => {
  it('returns the accepted-allergen (F3) cadence for the tolerance-building phase', () => {
    expect(cadenceForPhase('tolerance-building')).toBe(ACCEPTED_ALLERGEN_CADENCE_DAYS);
  });

  it('returns the reintroduction (F4) cadence for the reintroduction phase', () => {
    expect(cadenceForPhase('reintroduction')).toBe(REINTRODUCTION_CADENCE_DAYS);
  });
});

describe('stabilityWindowFor', () => {
  it('holds a minimum floor of SKIN_STABILITY_WINDOW_DAYS even when cadence is shorter', () => {
    // reintroduction cadence is 1 day; the stability window must not shrink below the 3-day floor.
    expect(stabilityWindowFor('reintroduction')).toBe(SKIN_STABILITY_WINDOW_DAYS);
  });

  it('grows with cadence when the phase cadence is at or above the floor', () => {
    // tolerance-building cadence is 3 days, which happens to equal the floor.
    expect(stabilityWindowFor('tolerance-building')).toBe(
      Math.max(ACCEPTED_ALLERGEN_CADENCE_DAYS, SKIN_STABILITY_WINDOW_DAYS),
    );
  });
});
