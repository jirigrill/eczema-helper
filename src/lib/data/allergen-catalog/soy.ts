import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const soy = {
  id: 'soy',
  origin: 'core',
  icon: '🫘',
  aliases: ['soy', 'soja', 'sója'],
  subitems: ['soy-milk', 'tofu', 'soy-sauce', 'soy-lecithin'],
  protocol: {
    days: [
      { day: 1, instructionCs: '100 ml sójového mléka nebo malá porce tofu', isEvaluationDay: false },
      { day: 2, instructionCs: '200 ml sójového mléka nebo střední porce tofu', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně sójových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
