import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const strawberries = {
  id: 'strawberries',
  origin: 'core',
  icon: '🍓',
  aliases: ['strawberries', 'jahody', 'jahoda'],
  subitems: ['fresh-strawberries', 'strawberry-jam'],
  protocol: {
    days: [
      { day: 1, instructionCs: 'Hrst jahod (cca 100 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Větší porce jahod (cca 200 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně jahod — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
