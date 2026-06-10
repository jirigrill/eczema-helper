import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const dairy = {
  id: 'dairy',
  icon: '🥛',
  aliases: ['dairy', 'milk', 'mleko', 'mléčné výrobky'],
  subitems: ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'cottage'],
  protocol: {
    days: [
      { day: 1, instructionCs: '100 ml kravského mléka nebo 1 jogurt', isEvaluationDay: false },
      { day: 2, instructionCs: '200 ml mléka nebo větší porce mléčného výrobku', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
      { day: 5, instructionCs: 'Neomezeně mléčných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
