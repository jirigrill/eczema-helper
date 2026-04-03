import type { Meal, MealItem, FoodSubItem } from '$lib/domain/models';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * Resolve the display name for a meal item.
 * Uses the Czech name from the predefined sub-item if available,
 * otherwise falls back to the custom name.
 */
export function getMealItemDisplayName(
  item: MealItem,
  subItems: FoodSubItem[]
): string {
  if (item.subItemId) {
    const subItem = subItems.find((si) => si.id === item.subItemId);
    return subItem?.nameCs ?? item.customName ?? 'Neznámá položka';
  }
  return item.customName ?? 'Neznámá položka';
}

/**
 * Format a meal for display: "Oběd: vepřové, brambory, zapečené mléko"
 */
export function formatMealSummary(
  meal: Meal,
  items: MealItem[],
  subItems: FoodSubItem[]
): string {
  const label = MEAL_TYPE_LABELS[meal.mealType as MealType];
  const itemNames = items.map((i) => getMealItemDisplayName(i, subItems));
  const suffix = meal.label ? ` (${meal.label})` : '';
  return `${label}${suffix}: ${itemNames.join(', ')}`;
}

/**
 * Get just the items as a comma-separated string.
 */
export function formatMealItems(items: MealItem[], subItems: FoodSubItem[]): string {
  return items.map((i) => getMealItemDisplayName(i, subItems)).join(', ');
}

/**
 * Resolve categoryId for a meal item from its subItemId.
 */
export function resolveCategoryId(
  subItemId: string,
  subItems: FoodSubItem[]
): string | undefined {
  return subItems.find((si) => si.id === subItemId)?.categoryId;
}

/**
 * Sort meals by meal type (breakfast first, dinner last).
 */
export function sortMealsByType(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    const aIdx = MEAL_TYPE_ORDER.indexOf(a.mealType as MealType);
    const bIdx = MEAL_TYPE_ORDER.indexOf(b.mealType as MealType);
    return aIdx - bIdx;
  });
}

/**
 * Check if a meal item matches a search query (case-insensitive).
 */
export function matchesMealItemSearch(
  subItem: FoodSubItem,
  query: string
): boolean {
  if (query.length < 2) return false;
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedName = subItem.nameCs.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalizedName.includes(normalizedQuery);
}

/**
 * Filter sub-items by search query.
 */
export function filterSubItemsBySearch(
  subItems: FoodSubItem[],
  query: string
): FoodSubItem[] {
  if (query.length < 2) return [];
  return subItems.filter((si) => matchesMealItemSearch(si, query));
}
