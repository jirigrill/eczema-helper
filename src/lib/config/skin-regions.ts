import type { RegionLevel } from '$lib/domain/models';
import { type SeverityStrings, severityStrings } from '$lib/strings/skin-regions';

export type SeverityConfig = SeverityStrings & {
  /** Tailwind class for the dot — solid token color. */
  dot: string;
  /**
   * Tailwind class for the tile background. Alpha staircase calibrated so
   * the level reads at a glance from the fill alone:
   *   level 0 → `bg-white` (no severity colour; calm-state lives on the dot/border)
   *   level 1 → `bg-warning/15`    (a faint wash — "mild")
   *   level 2 → `bg-severity-4/45` (firm orange — "moderate")
   *   level 3 → `bg-danger/60`     (loud red — "strong")
   * Consumed by `/skin` region tiles (full-size fill) and by
   * `SkinObservationCard` chips on `/day` (small pill fill).
   */
  tileBg: string;
  /** Tailwind class for the tile border when the region has this level (inactive). */
  tileBorder: string;
};

/**
 * Severity tokens: Czech label from the strings layer + Tailwind classes
 * derived from existing theme tokens in `src/app.css`. The mapping reuses the
 * shared palette rather than introducing skin-specific hex codes:
 *
 *   level 0 (klidné)   → `surface-dark` (the same hairline used elsewhere)
 *   level 1 (mírné)    → `warning`      (--color-warning: #C9A227)
 *   level 2 (střední)  → `severity-4`   (--color-severity-4: #C97027)
 *   level 3 (silné)    → `danger`       (--color-danger: #B84444)
 *
 * Tile background uses a non-linear opacity staircase — `/15` · `/45` · `/60`.
 * The earlier uniform `/15` ramp washed all three warm-family hues together
 * at chip size; the louder upper stops give "střední vs silné" a perceptible
 * gap on the small `SkinObservationCard` chips, and the same fills also read
 * as "clearly hit" on the large `/skin` region tiles without breaking layout.
 *
 * Tile border keeps the legacy `/50` opacity — it only ever sits on inactive
 * tiles, so a uniform hairline stays right.
 *
 * Level 0 has no severity colour — render sites read `tileBorder` for the
 * inactive hairline, `dot` for the calm-state dot.
 */
export const severityConfig = {
  0: {
    ...severityStrings[0],
    dot: 'bg-surface-dark',
    tileBg: 'bg-white',
    tileBorder: 'border-surface-dark',
  },
  1: {
    ...severityStrings[1],
    dot: 'bg-warning',
    tileBg: 'bg-warning/15',
    tileBorder: 'border-warning/50',
  },
  2: {
    ...severityStrings[2],
    dot: 'bg-severity-4',
    tileBg: 'bg-severity-4/45',
    tileBorder: 'border-severity-4/50',
  },
  3: {
    ...severityStrings[3],
    dot: 'bg-danger',
    tileBg: 'bg-danger/60',
    tileBorder: 'border-danger/50',
  },
} as const satisfies Record<RegionLevel, SeverityConfig>;
