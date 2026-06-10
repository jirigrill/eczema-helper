import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const meat = {
  id: 'meat',
  icon: '🥩',
  aliases: ['maso', 'vepřové', 'vepřo', 'prase', 'šunka', 'uzené', 'párek', 'klobása', 'hovězí', 'telecí', 'kuřecí', 'kuře', 'krůtí', 'kachna', 'husa', 'králík', 'zvěřina', 'srnčí', 'divočák', 'jehněčí', 'játra', 'vnitřnosti', 'meat', 'pork', 'beef', 'chicken', 'rabbit', 'game'],
  subitems: ['fresh-pork', 'cured-pork', 'sausages', 'beef', 'veal', 'chicken', 'turkey', 'duck-goose', 'rabbit', 'game', 'lamb', 'offal'],
} as const satisfies CanonicalAllergen;
