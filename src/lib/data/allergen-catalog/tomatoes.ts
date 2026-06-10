import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const tomatoes = {
  id: 'tomatoes',
  icon: '🍅',
  aliases: ['tomatoes', 'rajčata', 'rajče', 'rajský'],
  subitems: ['fresh-tomatoes', 'tomato-sauce', 'ketchup'],
  protocol: {
    days: [
      { day: 1, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 2, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně rajčat nebo paprik — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
