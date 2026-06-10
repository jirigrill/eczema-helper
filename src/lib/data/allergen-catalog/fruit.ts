import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const fruit = {
  id: 'fruit',
  icon: '🍎',
  aliases: ['ovoce', 'jablko', 'jablečný', 'hruška', 'třešně', 'višně', 'švestka', 'meruňka', 'broskev', 'hrozny', 'víno', 'rybíz', 'borůvky', 'maliny', 'angrešt', 'fruit', 'apple', 'pear', 'cherry', 'plum'],
  subitems: ['apple', 'pear', 'cherry', 'plum', 'apricot', 'peach', 'grapes', 'currants', 'blueberries', 'raspberries', 'gooseberry'],
} as const satisfies CanonicalAllergen;
