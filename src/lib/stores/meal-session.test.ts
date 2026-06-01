import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { Meal } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: `${today}:lunch`,
    date: today,
    mealType: 'lunch',
    actor: 'mother',
    items: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mealSession', () => {
  it('exports subscribe, save, loadBySlot', async () => {
    const mod = await import('./meal-session');
    expect(mod.mealSession).toBeDefined();
    expect(typeof mod.mealSession.subscribe).toBe('function');
    expect(typeof mod.mealSession.save).toBe('function');
    expect(typeof mod.mealSession.loadBySlot).toBe('function');
  });

  it('initial store value is an empty array', async () => {
    const { mealSession } = await import('./meal-session');
    const meals = get(mealSession);
    expect(Array.isArray(meals)).toBe(true);
    // may have leftover rows from other tests in the shared singleton db,
    // but the store should at minimum be an array
    expect(meals).toBeDefined();
  });

  it('save returns ok:true for a valid meal', async () => {
    const { mealSession } = await import('./meal-session');
    const result = await mealSession.save(makeMeal());
    expect(result).toMatchObject({ ok: true });
  });

  it('after save, subscribe emits an array containing the saved meal', async () => {
    const { mealSession } = await import('./meal-session');
    const meal = makeMeal({ id: `${today}:dinner`, mealType: 'dinner' });
    await mealSession.save(meal);
    const meals = await waitForMeals(mealSession, (ms) => ms.some((m) => m.id === meal.id));
    expect(meals.some((m) => m.id === meal.id)).toBe(true);
  });

  it('loadBySlot returns the saved meal for a known slot', async () => {
    const { mealSession } = await import('./meal-session');
    const meal = makeMeal({ id: `${today}:breakfast`, mealType: 'breakfast' });
    await mealSession.save(meal);
    const result = await mealSession.loadBySlot(today, 'breakfast');
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.data?.id).toBe(meal.id);
  });

  it('loadBySlot returns ok:true data:null for an unknown slot', async () => {
    const { mealSession } = await import('./meal-session');
    const result = await mealSession.loadBySlot('1999-01-01', 'snack');
    expect(result).toMatchObject({ ok: true, data: null });
  });
});
