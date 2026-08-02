import { describe, expect, it } from 'vitest';

import type { Meal, SkinObservation, SkinPhoto } from '$lib/domain/models';

import { dailyCompleteness, resolveDay } from './day-view';

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

describe('dailyCompleteness', () => {
  const observation: SkinObservation = {
    id: 'o1',
    date: today,
    createdAt: `${today}T08:00:00.000Z`,
    regions: [{ id: 'face', level: 1 }],
  };

  const photo: SkinPhoto = {
    id: 'p1',
    observationId: 'obs-1',
    region: 'face',
    capturedAt: `${today}T08:00:00.000Z`,
    blob: new Blob(),
  };

  const mealWithItems: Meal = {
    id: `${today}:lunch:mother`,
    date: today,
    mealType: 'lunch',
    actor: 'mother',
    items: [
      {
        id: 'i1',
        name: 'Rýže',
        foodId: 'rice:rice' as Meal['items'][number]['foodId'],
        amount: 'portion',
      },
    ],
    createdAt: `${today}T12:00:00.000Z`,
  };

  const emptyMeal: Meal = {
    id: `${today}:breakfast:mother`,
    date: today,
    mealType: 'breakfast',
    actor: 'mother',
    items: [],
    createdAt: `${today}T08:00:00.000Z`,
  };

  const noteOnlyMeal: Meal = {
    id: `${today}:snack:mother`,
    date: today,
    mealType: 'snack',
    actor: 'mother',
    items: [],
    notes: 'kafe u babičky',
    createdAt: `${today}T15:00:00.000Z`,
  };

  it('returns 0 when nothing is recorded', () => {
    expect(dailyCompleteness({ observations: [], photos: [], meals: [] })).toBe(0);
  });

  it('counts a skin observation as one point', () => {
    expect(dailyCompleteness({ observations: [observation], photos: [], meals: [] })).toBe(1);
  });

  it('counts a photo as one point', () => {
    expect(dailyCompleteness({ observations: [], photos: [photo], meals: [] })).toBe(1);
  });

  it('counts a meal with at least one item as one point', () => {
    expect(dailyCompleteness({ observations: [], photos: [], meals: [mealWithItems] })).toBe(1);
  });

  it('counts a notes-only meal as one point', () => {
    expect(dailyCompleteness({ observations: [], photos: [], meals: [noteOnlyMeal] })).toBe(1);
  });

  it('does not count a meal that has no items and no notes', () => {
    expect(dailyCompleteness({ observations: [], photos: [], meals: [emptyMeal] })).toBe(0);
  });

  it('returns 3 when all three record types are present', () => {
    expect(
      dailyCompleteness({ observations: [observation], photos: [photo], meals: [mealWithItems] }),
    ).toBe(3);
  });

  it('caps each record type at one point regardless of count', () => {
    expect(
      dailyCompleteness({
        observations: [observation, observation],
        photos: [photo, photo, photo],
        meals: [mealWithItems, noteOnlyMeal],
      }),
    ).toBe(3);
  });
});
