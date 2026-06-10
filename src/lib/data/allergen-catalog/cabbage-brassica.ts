import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const cabbageBrassica = {
  id: 'cabbage-brassica',
  icon: '🥬',
  aliases: ['zelí', 'kysané zelí', 'kapusta', 'brokolice', 'květák', 'kedlubna', 'cabbage', 'sauerkraut', 'broccoli', 'cauliflower', 'kohlrabi', 'kale', 'brassica'],
  subitems: ['sauerkraut', 'cooked-cabbage', 'broccoli-cauliflower', 'kohlrabi', 'kale'],
} as const satisfies CanonicalAllergen;
