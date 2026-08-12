import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

import type { PreparationMethod } from './models';

/**
 * Defensive fallback for a food id absent from the catalog. Since `FoodId` is
 * the catalog's own id union (issue #662), reaching this means a stale
 * persisted row, not a supported entry path — the everyday chip set keeps the
 * editor usable rather than blank while the caller is fixed.
 */
const DEFAULT_PREPARATIONS: readonly PreparationMethod[] = ['raw', 'boiled', 'baked', 'fried'];

/**
 * The preparation chips that make sense for a food, in chip-display order.
 * Read straight off the catalog record's hand-authored `preparations` list
 * (ADR-0028 — preparation applicability lives on the food, not on a coarse
 * form bucket). An unknown id falls back to the defensive default above.
 *
 * Catalog `preparations` gates *which chips the UI offers*; the stored
 * `preparationMethod` on a logged meal item is unconstrained (issue #314).
 */
export function preparationsForFood(foodId: string): readonly PreparationMethod[] {
  const record = FOODS.find((f) => f.id === foodId);
  return record?.preparations ?? DEFAULT_PREPARATIONS;
}
