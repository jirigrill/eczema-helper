import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const mustard = {
  id: 'mustard',
  icon: '🟡',
  aliases: ['hořčice', 'hořčičné semínko', 'mustard', 'plnotučná'],
  subitems: ['mustard-condiment', 'mustard-seed'],
} as const satisfies CanonicalAllergen;
