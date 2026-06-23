import type { RegionLevel } from '$lib/domain/models';
import { severityStrings, type SeverityStrings } from '$lib/strings/skin-regions';

export type SeverityConfig = SeverityStrings & {
  /** Tailwind class for the dot — solid token color. */
  dot: string;
  /** Tailwind class for the tile background — ~13% alpha tint of the token. */
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
 * Tile background uses Tailwind's `/15` opacity modifier, border uses `/50`,
 * matching the prototype's `~22` / `~80` alpha tints.
 *
 * Level 0 has no severity colour — render sites read `tileBorder` for the
 * inactive hairline, `dot` for the calm-state dot.
 */
export const severityConfig = {
  0: {
    ...severityStrings[0],
    dot:        'bg-surface-dark',
    tileBg:     'bg-white',
    tileBorder: 'border-surface-dark',
  },
  1: {
    ...severityStrings[1],
    dot:        'bg-warning',
    tileBg:     'bg-warning/15',
    tileBorder: 'border-warning/50',
  },
  2: {
    ...severityStrings[2],
    dot:        'bg-severity-4',
    tileBg:     'bg-severity-4/15',
    tileBorder: 'border-severity-4/50',
  },
  3: {
    ...severityStrings[3],
    dot:        'bg-danger',
    tileBg:     'bg-danger/15',
    tileBorder: 'border-danger/50',
  },
} as const satisfies Record<RegionLevel, SeverityConfig>;
