import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const citrus = {
  id: 'citrus',
  origin: 'core',
  icon: '🍋',
  aliases: ['citrus', 'citrony', 'pomeranče', 'mandarinky', 'grapefruit'],
  subitems: ['citrus:oranges', 'citrus:lemons', 'citrus:grapefruit', 'citrus:mandarins'],
  protocol: {
    days: [
      { day: 1, instructionCs: '1 mandarinka nebo sklenice džusu (150 ml)', isEvaluationDay: false },
      { day: 2, instructionCs: '2 mandarinky nebo 1 pomeranč', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně citrusů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
