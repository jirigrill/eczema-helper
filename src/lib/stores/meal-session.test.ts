import { get } from 'svelte/store';

import { describe, expect, it } from 'vitest';

import { db } from '$lib/db/atopic-db';
import type { Meal } from '$lib/domain/models';

import { createMealSession } from './meal-session';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

async function waitForMeals(
  store: { subscribe: (cb: (v: Meal[]) => void) => () => void },
  predicate: (meals: Meal[]) => boolean,
  timeoutMs = 500,
): Promise<Meal[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for meals predicate'));
    }, timeoutMs);
    unsub = store.subscribe((meals) => {
      if (predicate(meals)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(meals);
      }
    });
  });
}

describe('createMealSession — date-scoped reactive subscription', () => {
  it('returns a Svelte readable of Meal[] for the given date', () => {
    const session = createMealSession('2024-01-15');
    expect(typeof session.subscribe).toBe('function');
  });

  it('initial store value is an empty array', () => {
    const session = createMealSession('2024-02-01');
    const meals = get(session);
    expect(Array.isArray(meals)).toBe(true);
  });

  it('emits meals that get persisted to the scoped date', async () => {
    const date = '2024-03-10';
    const session = createMealSession(date);
    const meal: Meal = {
      id: `${date}:snack`,
      date,
      mealType: 'snack',
      actor: 'mother',
      items: [],
      createdAt: new Date().toISOString(),
    };
    await db.meals.put(meal);
    const meals = await waitForMeals(session, (ms) => ms.some((m) => m.id === meal.id));
    expect(meals.some((m) => m.id === meal.id)).toBe(true);
  });

  it('is scoped to its date — meals on other dates do not appear', async () => {
    const dateA = '2024-04-01';
    const dateB = '2024-04-02';
    const mealA: Meal = {
      id: `${dateA}:lunch`,
      date: dateA,
      mealType: 'lunch',
      actor: 'mother',
      items: [],
      createdAt: new Date().toISOString(),
    };
    await db.meals.put(mealA);
    const sessionB = createMealSession(dateB);
    // Give liveQuery time to settle.
    await new Promise((r) => setTimeout(r, 100));
    const mealsB = get(sessionB);
    expect(mealsB.some((m) => m.id === mealA.id)).toBe(false);
  });
});
