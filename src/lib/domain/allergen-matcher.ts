import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

const defaultCatalog: CanonicalCatalogPort = new BundledCatalogAdapter();

// Precision-biased normalization (ADR-0017): lowercase + trim + collapse whitespace
// + strip surrounding non-letters. Diacritics preserved; no stemming.
// A false merge is worse than a missed merge.
export function normalizeKey(raw: string): string {
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
export function matchAllergen(raw: string, catalog: CanonicalCatalogPort = defaultCatalog): CanonicalAllergen | null {
  const normalized = normalizeKey(raw);
  if (!normalized) return null;

  for (const record of catalog.list()) {
    if (record.id === normalized) return record;
    if (record.aliases.map(normalizeKey).includes(normalized)) return record;
  }

  return null;
}
