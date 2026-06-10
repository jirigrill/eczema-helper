import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const sulphitesAdditives = {
  id: 'sulphites-additives',
  icon: '🧪',
  aliases: ['siřičitany', 'sulfity', 'E220', 'konzervanty', 'aditiva', 'glutaman', 'dusitany', 'benzoany', 'barviva', 'sulphites', 'additives', 'preservatives'],
  subitems: ['sulphites', 'benzoates', 'nitrites', 'glutamate', 'colourings'],
} as const satisfies CanonicalAllergen;
