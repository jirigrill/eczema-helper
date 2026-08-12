/**
 * Precision-biased normalization of a free-text food name: lowercase + trim +
 * collapse whitespace + strip surrounding non-letters. Diacritics preserved;
 * no stemming. A false merge is worse than a missed merge.
 *
 * No live caller today. Retained deliberately, not by oversight: the parked
 * `allergen-matching` matcher normalizes both sides of a comparison with exactly
 * this function, and #662 story 15 asked for it to survive the harvest removal
 * in a neutral home rather than be deleted with it. Parking here means live
 * `src/`, not the `parked/protocol-engine` tag, because the tag's copy lives
 * inside the deleted harvest module — restoring it from there would drag the
 * removed feature back with it. See `docs/parked-features.md`.
 *
 * Delete this only together with the `allergen-matching` revive note.
 */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('cs')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}
