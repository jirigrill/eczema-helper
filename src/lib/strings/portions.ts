import type { PortionKind } from '$lib/domain/models';

export type PortionStrings = {
  label: string; // full Czech name used in meal log form
  short: string; // abbreviated label used in meal item chips
};

export const portionStrings = {
  pinch: { label: 'Špetka', short: 'šp.' },
  teaspoon: { label: 'Lžička', short: 'lž.' },
  spoon: { label: 'Lžíce', short: 'lžíce' },
  portion: { label: 'Porce', short: 'porce' },
  package: { label: 'Balení', short: 'bal.' },
} as const satisfies Record<PortionKind, PortionStrings>;
