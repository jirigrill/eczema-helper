import type { RegionLevel } from '$lib/domain/models';
import { severityStrings, type SeverityStrings } from '$lib/strings/skin-regions';

export type SeverityConfig = SeverityStrings & {
  /** CSS hex colour used for the dot, tile background tint, and inactive border. */
  hex: string;
};

/**
 * Severity tokens: Czech label from the strings layer + hex visual token.
 * Hex values come from the prototype (`docs/design/redesign-prototype.html`):
 *   mírné  #D9A82E (warm yellow)
 *   střední #C97027 (warm orange)
 *   silné  #B84444 (warm red)
 *
 * Level 0 (klidné) has no severity colour — render sites should fall back to
 * the surface-dark hairline rather than reading `hex`.
 */
export const severityConfig = {
  0: { ...severityStrings[0], hex: '#EDE8E9' },
  1: { ...severityStrings[1], hex: '#D9A82E' },
  2: { ...severityStrings[2], hex: '#C97027' },
  3: { ...severityStrings[3], hex: '#B84444' },
} as const satisfies Record<RegionLevel, SeverityConfig>;
