import type { Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type MealRepository = {
  /** Upsert a meal. A second save for the same slot (date + mealType) overwrites. */
  save(meal: Meal): Promise<Result<void, string>>;
  /** Load the meal for a specific date+mealType slot, or null if nothing saved yet. */
  loadBySlot(date: string, mealType: MealType): Promise<Result<Meal | null, string>>;
  /** Return all meals logged for a date, in any order. */
  listByDate(date: string): Promise<Result<Meal[], string>>;
};
