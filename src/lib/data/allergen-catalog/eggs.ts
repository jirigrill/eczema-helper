import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const eggs = {
  id: 'eggs',
  icon: '🥚',
  aliases: ['eggs', 'vejce', 'egg'],
  subitems: ['egg-white', 'egg-yolk'],
  protocol: {
    days: [
      { day: 1, instructionCs: '1 vařené vejce (celé)', isEvaluationDay: false },
      { day: 2, instructionCs: '2 vejce nebo vejce v jídle', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně vajec', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně vajec — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
