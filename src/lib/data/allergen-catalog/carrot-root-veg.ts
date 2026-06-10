import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const carrotRootVeg = {
  id: 'carrot-root-veg',
  icon: '🥕',
  aliases: ['kořenová zelenina', 'mrkev', 'karotka', 'petržel', 'pastinák', 'červená řepa', 'řepa', 'ředkev', 'celer', 'celery', 'celeriac', 'řapíkatý celer', 'bujón', 'carrot', 'root vegetable', 'beetroot'],
  subitems: ['carrot', 'parsley-root', 'parsnip', 'beetroot', 'radish', 'celery'],
} as const satisfies CanonicalAllergen;
