import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const corn = {
  id: 'corn',
  icon: '🌽',
  aliases: ['corn', 'kukuřice', 'kukuřičný'],
  subitems: ['corn-flour', 'sweet-corn'],
  protocol: {
    days: [
      { day: 1, instructionCs: 'Malá porce kukuřice (cca 50 g kukuřičné mouky nebo 1 klas)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce kukuřice', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně kukuřičných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
