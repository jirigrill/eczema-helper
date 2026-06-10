import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const sweeteners = {
  id: 'sweeteners',
  icon: '🍯',
  aliases: ['sladidla', 'med', 'medový', 'cukr', 'umělá sladidla', 'sirup', 'honey', 'sugar', 'sweetener', 'syrup'],
  subitems: ['honey', 'sugar', 'artificial-sweeteners', 'syrup'],
} as const satisfies CanonicalAllergen;
