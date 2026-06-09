import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const paprika = {
  id: 'paprika',
  origin: 'regional',
  icon: '🌶️',
  aliases: ['paprika', 'červená paprika', 'zelená paprika', 'žlutá paprika', 'pepř', 'chilli', 'chili'],
  subitems: ['sweet-pepper', 'chilli-pepper', 'paprika-powder'],
} as const satisfies CanonicalAllergen;
