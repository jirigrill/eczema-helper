import type { FoodForm } from '$lib/data/allergen-catalog/allergen-catalog';
import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

import type { PreparationMethod } from './models';

/**
 * Resolves a food's physical form to the preparation chips that make sense
 * for it. Catalog `form` is metadata only — `preparationMethod` on a logged
 * meal item is unconstrained (issue #314).
 */
export const formPreparations = {
  none: [],
  liquid: ['raw', 'boiled', 'baked'],
  cookable: ['raw', 'boiled', 'baked', 'fried'],
  'raw-only': ['raw'],
} as const satisfies Record<FoodForm, readonly PreparationMethod[]>;

/**
 * Looks up a food's `form` from the catalog. Custom user-typed foods
 * (`other:*` ids, never in FOODS) default to `cookable` — the editor shows
 * the full chip set so users can pick freely.
 */
export function formForFood(foodId: string): FoodForm {
  const record = FOODS.find((f) => f.id === foodId);
  return record?.form ?? 'cookable';
}
