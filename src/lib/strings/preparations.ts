import type { PreparationMethod } from '$lib/domain/models';

export type PreparationStrings = {
  label: string; // Czech label used in preparation method chips
};

export const preparationStrings = {
  raw: { label: 'Syrové' },
  boiled: { label: 'Vařené' },
  baked: { label: 'Pečené' },
  fried: { label: 'Smažené' },
  dried: { label: 'Sušené' },
  smoked: { label: 'Uzené' },
  cured: { label: 'Naložené' },
} as const satisfies Record<PreparationMethod, PreparationStrings>;
