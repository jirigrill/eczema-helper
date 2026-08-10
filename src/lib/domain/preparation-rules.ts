import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

import type { PreparationMethod } from './models';

/**
 * The permissive fallback chip set for foods the catalog doesn't know —
 * custom user-typed foods (`other:*` ids, never in FOODS) and any unknown id.
 * The everyday set a mother would reach for; the food editor shows all four so
 * the user can pick freely (ADR-0028).
 */
const DEFAULT_PREPARATIONS: readonly PreparationMethod[] = ['raw', 'boiled', 'baked', 'fried'];

/**
 * The preparation chips that make sense for a food, in chip-display order.
 * Read straight off the catalog record's hand-authored `preparations` list
 * (ADR-0028 — preparation applicability lives on the food, not on a coarse
 * form bucket). Custom/unknown foods fall back to the permissive default.
 *
 * Catalog `preparations` gates *which chips the UI offers*; the stored
 * `preparationMethod` on a logged meal item is unconstrained (issue #314).
 */
export function preparationsForFood(foodId: string): readonly PreparationMethod[] {
  const record = FOODS.find((f) => f.id === foodId);
  return record?.preparations ?? DEFAULT_PREPARATIONS;
}
