import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const spicesHerbs = {
  id: 'spices-herbs',
  icon: '🌿',
  aliases: ['koření', 'bylinky', 'kmín', 'skořice', 'pepř', 'bobkový list', 'majoránka', 'mletá paprika', 'chilli', 'chili', 'spices', 'herbs', 'caraway', 'cinnamon', 'pepper', 'bay leaf', 'marjoram', 'paprika powder'],
  subitems: ['caraway', 'cinnamon', 'pepper', 'bay-leaf', 'marjoram', 'chilli-pepper', 'paprika-powder'],
} as const satisfies CanonicalAllergen;
