import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

// Precision-biased normalization (ADR-0017): lowercase + trim + collapse whitespace
// + strip surrounding non-letters. Diacritics preserved; no stemming.
// A false merge is worse than a missed merge.
function normalize(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('cs')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}

/**
 * Resolves raw free-text to a known CanonicalAllergen by matching against
 * catalog ids and aliases after normalization (ADR-0017).
 * Returns null for unknown or empty input — never creates an other: entry.
 */
export function matchAllergen(raw: string): CanonicalAllergen | null {
  const normalized = normalize(raw);
  if (!normalized) return null;

  for (const record of ALLERGEN_CATALOG as readonly CanonicalAllergen[]) {
    if (record.id === normalized) return record;
    if (record.aliases.map(normalize).includes(normalized)) return record;
  }

  return null;
}
