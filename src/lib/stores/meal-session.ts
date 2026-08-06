import type { Readable } from 'svelte/store';

import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { db } from '$lib/db/atopic-db';
import type { Meal } from '$lib/domain/models';

/**
 * The one `MealRepository` instance for the app — this module owns the meal
 * domain's adapter, mirroring `skin-observation-session.ts`. Point reads and
 * writes import it rather than each hand-rolling `new DexieMealRepository(db)`;
 * that duplication left four independent instances and no single seam to swap
 * storage behind (`docs/architecture/ports-and-adapters.md`).
 */
export const mealRepository = new DexieMealRepository(db);

export function createMealSession(date: string): Readable<Meal[]> {
  return createDateScopedSession<Meal>(db.meals, date);
}
