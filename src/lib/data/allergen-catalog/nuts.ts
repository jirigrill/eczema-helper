import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const nuts = {
  id: 'nuts',
  icon: '🥜',
  aliases: ['nuts', 'ořechy', 'arašídy', 'mandle', 'vlašské ořechy'],
  subitems: ['peanuts', 'walnuts', 'hazelnuts', 'almonds', 'cashews'],
  protocol: {
    days: [
      { day: 1, instructionCs: '5–6 ořechů (např. vlašských nebo mandlí)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Hrst ořechů nebo 2 lžíce ořechového másla', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně ořechů', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně ořechů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
