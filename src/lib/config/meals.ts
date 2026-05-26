import type { MealType } from '$lib/domain/models';
import { mealStrings, type MealStrings } from '$lib/strings/meals';

export type MealConfig = MealStrings & {
  icon: string; // emoji shown next to meal type label
};

export const mealConfig = {
  breakfast: { ...mealStrings.breakfast, icon: '🌅' },
  lunch:     { ...mealStrings.lunch,     icon: '☀️' },
  snack:     { ...mealStrings.snack,     icon: '🍎' },
  dinner:    { ...mealStrings.dinner,    icon: '🌙' },
} as const satisfies Record<MealType, MealConfig>;
