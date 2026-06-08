import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const fish = {
  id: 'fish',
  origin: 'core',
  icon: '🐟',
  aliases: ['fish', 'ryba', 'ryby'],
  subitems: ['fish:freshwater-fish', 'fish:saltwater-fish', 'fish:fish-oil'],
  protocol: {
    days: [
      { day: 1, instructionCs: '1 malá porce ryby (cca 50 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce ryby (cca 100 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně ryb — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
