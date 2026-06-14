import type { Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type MealRepository = {
  /** Upsert a meal. A second save for the same slot (date + mealType) overwrites. */
  save(meal: Meal): Promise<Result<void, string>>;
  /** Load the meal for a specific date+mealType slot, or null if nothing saved yet. */
  loadBySlot(date: string, mealType: MealType): Promise<Result<Meal | null, string>>;
  /** Return all meals logged for a date, in any order. */
  listByDate(date: string): Promise<Result<Meal[], string>>;
  /**
   * Delete the meal occupying a slot, if any. A no-op (still Ok) when the slot
   * is already empty. Used by the MOVE semantics to empty the source slot once
   * the working list is re-saved under a different meal type (ADR-0019).
   */
  remove(date: string, mealType: MealType): Promise<Result<void, string>>;
};
