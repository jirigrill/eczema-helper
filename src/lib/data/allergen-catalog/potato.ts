import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const potato = {
  id: 'potato',
  icon: '🥔',
  aliases: ['brambory', 'brambor', 'bramborový', 'knedlík', 'bramborové knedlíky', 'hranolky', 'potato'],
  subitems: ['boiled-potato', 'potato-dumplings', 'fried-potato'],
} as const satisfies CanonicalAllergen;
