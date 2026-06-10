import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const legumes = {
  id: 'legumes',
  icon: '🫘',
  aliases: ['luštěniny', 'čočka', 'fazole', 'hrách', 'cizrna', 'vlčí bob', 'legumes', 'lentils', 'beans', 'peas', 'chickpea', 'lupin'],
  subitems: ['lentils', 'beans', 'peas', 'chickpea', 'lupin'],
} as const satisfies CanonicalAllergen;
