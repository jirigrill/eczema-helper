import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const otherVegetables = {
  id: 'other-vegetables',
  icon: '🥒',
  aliases: ['zelenina', 'okurka', 'cuketa', 'dýně', 'špenát', 'salát', 'paprika', 'červená paprika', 'zelená paprika', 'žlutá paprika', 'cucumber', 'zucchini', 'pumpkin', 'spinach', 'lettuce', 'bell pepper', 'vegetables'],
  subitems: ['cucumber', 'zucchini', 'pumpkin', 'spinach', 'lettuce', 'sweet-pepper'],
} as const satisfies CanonicalAllergen;
