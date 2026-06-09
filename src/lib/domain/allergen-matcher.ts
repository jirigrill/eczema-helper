import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';
import { normalizeAllergenName } from './allergen-normalizer';

/**
 * Resolves raw free-text to a known CanonicalAllergen by matching against
 * catalog ids and aliases after normalization (ADR-0017).
 * Returns null for unknown or empty input — never creates an other: entry.
 */
export function matchAllergen(raw: string): CanonicalAllergen | null {
  const normalized = normalizeAllergenName(raw);
  if (!normalized) return null;

  for (const record of ALLERGEN_CATALOG as readonly CanonicalAllergen[]) {
    if (record.id === normalized) return record;
    const normalizedAliases = record.aliases.map((a) => normalizeAllergenName(a));
    if (normalizedAliases.includes(normalized)) return record;
  }

  return null;
}
