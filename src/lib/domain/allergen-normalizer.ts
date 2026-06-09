/**
 * Precision-biased normalization for allergen name matching (ADR-0017).
 * Lowercase + trim + collapse whitespace + strip surrounding non-letters.
 * Diacritics preserved; no stemming; no synonym resolution.
 * A false merge is worse than a missed merge.
 */
export function normalizeAllergenName(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('cs')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}
