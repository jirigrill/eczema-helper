import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const coffeeTea = {
  id: 'coffee-tea',
  icon: '☕',
  aliases: ['káva', 'kafe', 'kofein', 'čaj', 'černý čaj', 'bylinkový čaj', 'coffee', 'tea', 'caffeine'],
  subitems: ['coffee', 'black-tea', 'herbal-tea'],
} as const satisfies CanonicalAllergen;
