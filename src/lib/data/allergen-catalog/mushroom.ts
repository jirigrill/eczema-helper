import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const mushroom = {
  id: 'mushroom',
  icon: '🍄',
  aliases: ['houby', 'hřib', 'žampion', 'lesní houby', 'mushroom', 'fungi'],
  subitems: ['wild-mushrooms', 'cultivated-mushrooms'],
} as const satisfies CanonicalAllergen;
