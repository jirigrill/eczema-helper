import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const wheat = {
  id: 'wheat',
  origin: 'core',
  icon: '🌾',
  aliases: ['wheat', 'pšenice', 'lepek', 'gluten'],
  subitems: ['bread', 'pasta', 'flour', 'gluten'],
  protocol: {
    days: [
      { day: 1, instructionCs: '1 krajíc chleba nebo malá porce těstovin', isEvaluationDay: false },
      { day: 2, instructionCs: '2–3 krajíce chleba nebo střední porce těstovin', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně pšeničných výrobků', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně pšeničných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
