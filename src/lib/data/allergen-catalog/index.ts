// Single source of truth is three-collections.ts — all allergen data lives there.
// This barrel re-exports catalog types and provides helpers that need the strings layer.

export {
  FAMILIES,
  ALLERGENS,
  FOODS,
} from './three-collections';

export type {
  FamilyId,
  CatalogFamily,
  CatalogAllergenId3 as CatalogAllergenId,
  AllergenId,
  CustomAllergenId,
  ProtocolAllergenId3 as ProtocolAllergenId,
  CatalogFoodId,
  FoodId,
} from './three-collections';

import { ALLERGENS } from './three-collections';
import { categoryStrings } from '$lib/strings/categories';
import type { AllergenProtocol } from '$lib/domain/canonical-allergen';

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

export function getProtocolForAllergen(id: string): AllergenProtocol | undefined {
  const record = ALLERGENS.find((r) => r.id === id) as { protocol?: AllergenProtocol } | undefined;
  return record?.protocol;
}
