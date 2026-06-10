import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const onionGarlic = {
  id: 'onion-garlic',
  icon: '🧅',
  aliases: ['cibule', 'česnek', 'pórek', 'onion', 'garlic', 'leek', 'allium'],
  subitems: ['onion', 'garlic', 'leek'],
} as const satisfies CanonicalAllergen;
