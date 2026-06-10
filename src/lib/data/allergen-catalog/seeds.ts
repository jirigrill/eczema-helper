import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const seeds = {
  id: 'seeds',
  icon: '🌻',
  aliases: ['semínka', 'mák', 'makový', 'makovec', 'slunečnicová semínka', 'dýňová semínka', 'lněné semínko', 'len', 'poppy', 'sunflower', 'pumpkin seed', 'flax', 'seeds'],
  subitems: ['poppy-seed', 'sunflower-seed', 'pumpkin-seed', 'flax-seed'],
} as const satisfies CanonicalAllergen;
