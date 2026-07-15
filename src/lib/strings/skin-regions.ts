import type { RegionId, RegionLevel } from '$lib/domain/models';

export type RegionStrings = {
  /** Czech display label, e.g. "Tváře", "Loketní jamky". */
  label: string;
};

/**
 * Czech labels for each body region rendered on /skin. Keys are canonical
 * `RegionId` slugs; the `satisfies Record<RegionId, ...>` clause below makes
 * `bunx tsc --noEmit` fail when a region is added without a label.
 */
export const regionStrings = {
  face: { label: 'Tváře' },
  scalp: { label: 'Vlasová část' },
  neck: { label: 'Krk' },
  belly: { label: 'Břicho' },
  back: { label: 'Záda' },
  arms: { label: 'Paže' },
  'elbow-folds': { label: 'Loketní jamky' },
  'knee-folds': { label: 'Podkolení' },
  legs: { label: 'Nohy' },
} as const satisfies Record<RegionId, RegionStrings>;

export type SeverityStrings = {
  /** Czech label shown under each region tile. */
  label: string;
};

/** Czech labels for the four severity levels — 0 (klidné) through 3 (silné). */
export const severityStrings = {
  0: { label: 'klidné' },
  1: { label: 'mírné' },
  2: { label: 'střední' },
  3: { label: 'silné' },
} as const satisfies Record<RegionLevel, SeverityStrings>;

/**
 * Renders the per-severity count suffix shown in /program's skin recap, e.g.
 * "× klidné", "× mírné". Built from `severityStrings[lvl].label` so adding a
 * new severity tier is a single-source change.
 */
export function severityCountSuffix(lvl: RegionLevel): string {
  return `× ${severityStrings[lvl].label}`;
}
