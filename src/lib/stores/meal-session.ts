import type { Readable } from 'svelte/store';

import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { db } from '$lib/db/atopic-db';
import type { Actor, Meal, MealType } from '$lib/domain/models';
import type { DiscardedMealCopy } from '$lib/stores/discard-buffer';
import type { Result } from '$lib/types/result';
import { todayIso } from '$lib/utils/date';

/**
 * The one `MealRepository` instance for the app — this module owns the meal
 * domain's adapter, mirroring `skin-observation-session.ts`. Point reads and
 * writes import it rather than each hand-rolling `new DexieMealRepository(db)`;
 * that duplication left four independent instances and no single seam to swap
 * storage behind (`docs/architecture/ports-and-adapters.md`). Routes must go
 * through `mealSession` below instead of this instance directly.
 */
export const mealRepository = new DexieMealRepository(db);

export type MealSession = {
  subscribe: Readable<Meal[]>['subscribe'];
  save(meal: Meal): Promise<Result<void, string>>;
  loadBySlot(date: string, mealType: MealType, actor: Actor): Promise<Result<Meal | null, string>>;
  remove(date: string, mealType: MealType, actor: Actor): Promise<Result<void, string>>;
  /**
   * Reverse a copy-meal write (issue #606): removes the slot the copy
   * created, or — when the copy merged into an existing meal — drops only
   * the items it added and restores the destination's prior `updatedAt`.
   * Owns the reversal so the layout's undo toast only has to call it, not
   * reconstruct the merge-vs-create branch itself.
   */
  reverseCopy(copy: DiscardedMealCopy): Promise<Result<void, string>>;
};

export function createMealSession(date: string): MealSession {
  const meals = createDateScopedSession<Meal>(db.meals, date);

  async function save(meal: Meal): Promise<Result<void, string>> {
    return mealRepository.save(meal);
  }

  async function loadBySlot(
    slotDate: string,
    mealType: MealType,
    actor: Actor,
  ): Promise<Result<Meal | null, string>> {
    return mealRepository.loadBySlot(slotDate, mealType, actor);
  }

  async function remove(
    slotDate: string,
    mealType: MealType,
    actor: Actor,
  ): Promise<Result<void, string>> {
    return mealRepository.remove(slotDate, mealType, actor);
  }

  async function reverseCopy(copy: DiscardedMealCopy): Promise<Result<void, string>> {
    const { date: slotDate, mealType, actor } = copy.destinationSlot;
    if (!copy.destinationPreexisted) {
      return remove(slotDate, mealType, actor);
    }
    const loaded = await loadBySlot(slotDate, mealType, actor);
    if (!loaded.ok || !loaded.data) return { ok: true, data: undefined };
    const added = new Set(copy.addedItemIds);
    return save({
      ...loaded.data,
      items: loaded.data.items.filter((i) => !added.has(i.id)),
      updatedAt: copy.priorUpdatedAt,
    });
  }

  return { subscribe: meals.subscribe, save, loadBySlot, remove, reverseCopy };
}

/**
 * Shared meal session for mutation call sites that aren't scoped to a single
 * day's subscription — the layout's copy-undo reversal and the meal route's
 * delete/copy actions all mutate slots outside whichever date they were
 * constructed against, so a single "today" instance is as valid a home as any
 * (mirrors `skinObservationSession`).
 */
export const mealSession: MealSession = createMealSession(todayIso());
