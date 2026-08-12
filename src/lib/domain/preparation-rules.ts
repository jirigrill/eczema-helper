import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import type { FoodId } from '$lib/data/allergen-catalog/allergen-catalog';

import type { PreparationMethod } from './models';

/**
 * The preparation chips that make sense for a food, in chip-display order.
 * Read straight off the catalog record's hand-authored `preparations` list
 * (ADR-0028 — preparation applicability lives on the food, not on a coarse
 * form bucket).
 *
 * Every caller passes a catalog id, so the lookup is total in fact — but
 * `Array.find` is not total in the type system regardless. The miss returns
 * nothing rather than a guessed chip set: an empty list is an ordinary authored
 * state (37 foods carry one — salt, oils, drinks) that `FoodEditor` renders as
 * no chip row, whereas guessing would invite a preparation to be recorded
 * against a food we could not identify. This renderer can stay total because
 * `fromMealItems` throws on an unknown id, so no meal reaching the editor holds
 * one.
 *
 * Catalog `preparations` gates *which chips the UI offers*; the stored
 * `preparationMethod` on a logged meal item is unconstrained (issue #314).
 */
export function preparationsForFood(foodId: FoodId): readonly PreparationMethod[] {
  return FOODS.find((f) => f.id === foodId)?.preparations ?? [];
}
