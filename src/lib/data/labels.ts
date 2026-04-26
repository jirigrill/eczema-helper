import type { AmountSize } from '$lib/domain/models';

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  snack: 'Svačina',
  dinner: 'Večeře',
};

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
};

export const AMOUNT_LABELS: Record<AmountSize, { label: string; short: string }> = {
  pinch: { label: 'Špetka', short: 'šp.' },
  teaspoon: { label: 'Lžička', short: 'lž.' },
  spoon: { label: 'Lžíce', short: 'lžíce' },
  portion: { label: 'Porce', short: 'porce' },
  package: { label: 'Balení', short: 'bal.' },
};
