// Single source of truth is allergen-catalog.ts — all allergen data lives there.
// This barrel re-exports catalog types and provides helpers that need the strings layer.

export {
  FAMILIES,
  ALLERGENS,
  FOODS,
} from './allergen-catalog';

export type {
  FamilyId,
  CatalogFamily,
  CatalogAllergenId,
  AllergenId,
  CustomAllergenId,
  LadderAllergenId,
  CatalogFoodId,
  FoodId,
  LadderStepId,
} from './allergen-catalog';

import { ALLERGENS } from './allergen-catalog';
import { categoryStrings } from '$lib/strings/categories';

/** Flat array of all allergen records — compatibility shim; prefer ALLERGENS. */
export const ALLERGEN_CATALOG = ALLERGENS;

export type CategoryConfig = {
  name: string;
  icon: string;
};

export function getCategoryConfig(id: string): CategoryConfig | undefined {
  const record = ALLERGENS.find((r) => r.id === id);
  if (!record) return undefined;
  const strings = (categoryStrings as Record<string, { name: string }>)[id];
  if (!strings) return undefined;
  return { name: strings.name, icon: record.icon };
}

import type { FamilyId } from './allergen-catalog';

/** All catalog allergens that belong to the given family, in catalog order. */
export function allergensByFamily(familyId: FamilyId): typeof ALLERGENS[number][] {
  return ALLERGENS.filter((a) => a.familyId === familyId);
}

/**
 * Returns the single allergen id for a family that contains exactly one allergen,
 * or null for multi-allergen families. Used to collapse the drill-in step.
 */
export function singleAllergenFamily(familyId: FamilyId): string | null {
  const members = allergensByFamily(familyId);
  return members.length === 1 ? members[0].id : null;
}
