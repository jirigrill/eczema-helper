import type { MealType } from '$lib/domain/models';

export type MealStrings = {
  label: string; // Czech name shown in meal log form and saved-meals list
};

export const mealStrings = {
  breakfast: { label: 'Snídaně' },
  lunch:     { label: 'Oběd'    },
  snack:     { label: 'Svačina' },
  dinner:    { label: 'Večeře'  },
} as const satisfies Record<MealType, MealStrings>;
