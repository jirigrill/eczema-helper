import type { Actor, Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type MealRepository = {
  /** Upsert a meal. A second save for the same slot (date + mealType + actor) overwrites. */
  save(meal: Meal): Promise<Result<void, string>>;
  /** Load the meal for a specific date+mealType+actor slot, or null if nothing saved yet. */
  loadBySlot(date: string, mealType: MealType, actor: Actor): Promise<Result<Meal | null, string>>;
  /** Return all meals logged for a date, in any order. */
  listByDate(date: string): Promise<Result<Meal[], string>>;
  /**
   * Delete the meal occupying a slot, if any. A no-op (still Ok) when the slot
   * is already empty. Used by the explicit "Smazat jídlo" action on /meal in
   * edit mode (ADR-0018, issue #268). The page snapshots the working meal into
   * the discard buffer before calling this so the layout's undo toast can
   * rehydrate the working list — re-Hotovo then re-persists a fresh copy.
   */
  remove(date: string, mealType: MealType, actor: Actor): Promise<Result<void, string>>;
};
