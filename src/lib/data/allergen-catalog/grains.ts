import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const grains = {
  id: 'grains',
  icon: '🌾',
  aliases: ['obiloviny', 'oves', 'ovesné vločky', 'žito', 'žitný', 'ječmen', 'pohanka', 'jáhly', 'rýže', 'oats', 'rye', 'barley', 'buckwheat', 'millet', 'rice', 'cereals'],
  subitems: ['oats', 'rye', 'barley', 'buckwheat', 'millet', 'rice'],
} as const satisfies CanonicalAllergen;
