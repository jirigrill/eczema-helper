import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const yeast = {
  id: 'yeast',
  icon: '🍞',
  aliases: ['droždí', 'kvasnice', 'kvasinky', 'kvasnicový extrakt', 'yeast', 'marmite'],
  subitems: ['bakers-yeast', 'yeast-extract'],
} as const satisfies CanonicalAllergen;
