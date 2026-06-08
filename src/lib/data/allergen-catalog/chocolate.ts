import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const chocolate = {
  id: 'chocolate',
  origin: 'core',
  icon: '🍫',
  aliases: ['chocolate', 'čokoláda', 'kakao', 'cocoa'],
  subitems: ['dark-choc', 'milk-choc', 'cocoa'],
  protocol: {
    days: [
      { day: 1, instructionCs: '2–3 kostičky hořké čokolády (min. 70 % kakaa)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Polovina tabulky čokolády', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně čokolády — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies CanonicalAllergen;
