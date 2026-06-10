import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const sesame = {
  id: 'sesame',
  icon: '🌰',
  aliases: ['sesame', 'sezam', 'tahini', 'sezamová semínka'],
  subitems: ['sesame-seeds', 'tahini'],
  protocol: {
    days: [
      { day: 1, instructionCs: '1 lžička sezamových semínek nebo tahini', isEvaluationDay: false },
      { day: 2, instructionCs: '2–3 lžíce tahini nebo větší porce sezamu', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně sezamových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
