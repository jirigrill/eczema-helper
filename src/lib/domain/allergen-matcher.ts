import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';
import { normalizeKey } from '$lib/domain/harvest-candidate';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';

/**
 * Resolves raw free-text to a known CanonicalAllergen by matching against
 * catalog ids and aliases after normalization (ADR-0017).
 * Returns null for unknown or empty input — never creates an other: entry.
 */
export function matchAllergen(
  raw: string,
  catalog: CanonicalCatalogPort,
): CanonicalAllergen | null {
  const normalized = normalizeKey(raw);
  if (!normalized) return null;

  for (const record of catalog.list()) {
    if (record.id === normalized) return record;
    if (record.aliases.map(normalizeKey).includes(normalized)) return record;
  }

  return null;
}

export type FoodMatch = {
  foodId: string;
  allergenIds: readonly string[];
};

/**
 * Resolves raw free-text to a catalog food record by matching food ids and
 * aliases after normalization. Returns null for unknown or empty input.
 */
export function matchFood(raw: string, catalog: CanonicalCatalogPort): FoodMatch | null {
  const normalized = normalizeKey(raw);
  if (!normalized) return null;

  for (const food of catalog.listFoods()) {
    if (food.id === normalized) return { foodId: food.id, allergenIds: food.allergenIds };
    const aliases: readonly string[] = food.aliases ?? [];
    if (aliases.map(normalizeKey).includes(normalized))
      return { foodId: food.id, allergenIds: food.allergenIds };
  }

  return null;
}
