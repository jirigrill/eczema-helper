import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const shellfish = {
  id: 'shellfish',
  origin: 'core',
  icon: '🦐',
  aliases: ['shellfish', 'korýši', 'měkkýši', 'krevety', 'krab', 'mušle'],
  subitems: ['shrimp', 'crab', 'mussels'],
  protocol: {
    days: [
      { day: 1, instructionCs: 'Malá porce korýšů nebo měkkýšů (cca 50 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce korýšů nebo měkkýšů (cca 100 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně korýšů a měkkýšů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
