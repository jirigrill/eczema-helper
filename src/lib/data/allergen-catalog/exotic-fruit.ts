import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const exoticFruit = {
  id: 'exotic-fruit',
  icon: '🥭',
  aliases: ['exotické ovoce', 'banán', 'kiwi', 'mango', 'marakuja', 'mučenka', 'ananas', 'avokádo', 'banana', 'avocado', 'pineapple', 'passion fruit'],
  subitems: ['banana', 'kiwi', 'mango', 'passion-fruit', 'pineapple', 'avocado'],
} as const satisfies CanonicalAllergen;
