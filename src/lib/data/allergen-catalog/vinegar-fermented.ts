import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const vinegarFermented = {
  id: 'vinegar-fermented',
  icon: '🍶',
  aliases: ['ocet', 'kvašák', 'nakládané', 'okurky', 'nakládaná zelenina', 'fermentované', 'vinegar', 'pickled', 'fermented'],
  subitems: ['vinegar', 'pickled-veg'],
} as const satisfies CanonicalAllergen;
