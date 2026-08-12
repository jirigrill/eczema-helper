/**
 * Precision-biased normalization of a free-text food name: lowercase + trim +
 * collapse whitespace + strip surrounding non-letters. Diacritics preserved;
 * no stemming. A false merge is worse than a missed merge.
 *
 * No live caller today — kept for the parked `allergen-matching` feature, whose
 * matcher normalizes both sides of a comparison with exactly this function
 * (see `docs/parked-features.md`).
 */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('cs')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}
