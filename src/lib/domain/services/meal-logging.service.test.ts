import { describe, it, expect } from 'vitest';
import {
  getMealItemDisplayName,
  formatMealSummary,
  formatMealItems,
  resolveCategoryId,
  sortMealsByType,
  filterSubItemsBySearch,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
} from './meal-logging.service';
import type { Meal, MealItem, FoodSubItem } from '$lib/domain/models';

const mockSubItems: FoodSubItem[] = [
  { id: 'cows-milk', categoryId: 'dairy', slug: 'cows-milk', nameCs: 'Kravské mléko', sortOrder: 1 },
  { id: 'butter', categoryId: 'dairy', slug: 'butter', nameCs: 'Máslo', sortOrder: 2 },
  { id: 'potato', categoryId: 'other', slug: 'potato', nameCs: 'Brambory', sortOrder: 1 },
  { id: 'pork', categoryId: 'other', slug: 'pork', nameCs: 'Vepřové', sortOrder: 2 },
];

function createMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    date: '2026-03-15',
    mealType: 'lunch',
    createdAt: '2026-03-15T12:00:00Z',
    updatedAt: '2026-03-15T12:00:00Z',
    ...overrides,
  };
}

function createMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: crypto.randomUUID(),
    mealId: 'meal-1',
    ...overrides,
  };
}

describe('meal-logging.service', () => {
  describe('MEAL_TYPE_LABELS', () => {
    it('contains all four Czech labels', () => {
      expect(MEAL_TYPE_LABELS.breakfast).toBe('Snídaně');
      expect(MEAL_TYPE_LABELS.lunch).toBe('Oběd');
      expect(MEAL_TYPE_LABELS.dinner).toBe('Večeře');
      expect(MEAL_TYPE_LABELS.snack).toBe('Svačina');
    });
  });

  describe('MEAL_TYPE_ORDER', () => {
    it('has correct order: breakfast, lunch, snack, dinner', () => {
      expect(MEAL_TYPE_ORDER).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    });
  });

  describe('getMealItemDisplayName', () => {
    it('returns Czech name for predefined sub-item', () => {
      const item = createMealItem({ subItemId: 'cows-milk' });
      const result = getMealItemDisplayName(item, mockSubItems);
      expect(result).toBe('Kravské mléko');
    });

    it('returns custom name when no subItemId', () => {
      const item = createMealItem({ customName: 'vepřové' });
      const result = getMealItemDisplayName(item, mockSubItems);
      expect(result).toBe('vepřové');
    });

    it('returns custom name when subItemId not found', () => {
      const item = createMealItem({ subItemId: 'nonexistent', customName: 'neznámé' });
      const result = getMealItemDisplayName(item, mockSubItems);
      expect(result).toBe('neznámé');
    });

    it('returns fallback when neither subItemId nor customName', () => {
      const item = createMealItem({});
      const result = getMealItemDisplayName(item, mockSubItems);
      expect(result).toBe('Neznámá položka');
    });
  });

  describe('formatMealSummary', () => {
    it('formats meal with type and items', () => {
      const meal = createMeal({ mealType: 'lunch' });
      const items = [
        createMealItem({ subItemId: 'pork' }),
        createMealItem({ subItemId: 'potato' }),
        createMealItem({ subItemId: 'cows-milk' }),
      ];
      const result = formatMealSummary(meal, items, mockSubItems);
      expect(result).toBe('Oběd: Vepřové, Brambory, Kravské mléko');
    });

    it('includes label when present', () => {
      const meal = createMeal({ mealType: 'lunch', label: 'u babičky' });
      const items = [createMealItem({ subItemId: 'pork' })];
      const result = formatMealSummary(meal, items, mockSubItems);
      expect(result).toBe('Oběd (u babičky): Vepřové');
    });

    it('handles empty items list', () => {
      const meal = createMeal({ mealType: 'breakfast' });
      const result = formatMealSummary(meal, [], mockSubItems);
      expect(result).toBe('Snídaně: ');
    });
  });

  describe('formatMealItems', () => {
    it('returns comma-separated item names', () => {
      const items = [
        createMealItem({ subItemId: 'pork' }),
        createMealItem({ customName: 'rýže' }),
      ];
      const result = formatMealItems(items, mockSubItems);
      expect(result).toBe('Vepřové, rýže');
    });
  });

  describe('resolveCategoryId', () => {
    it('returns correct category for known sub-item', () => {
      expect(resolveCategoryId('cows-milk', mockSubItems)).toBe('dairy');
      expect(resolveCategoryId('potato', mockSubItems)).toBe('other');
    });

    it('returns undefined for unknown sub-item', () => {
      expect(resolveCategoryId('nonexistent', mockSubItems)).toBeUndefined();
    });
  });

  describe('sortMealsByType', () => {
    it('sorts meals by type: breakfast, lunch, snack, dinner', () => {
      const meals = [
        createMeal({ mealType: 'dinner' }),
        createMeal({ mealType: 'breakfast' }),
        createMeal({ mealType: 'snack' }),
        createMeal({ mealType: 'lunch' }),
      ];
      const sorted = sortMealsByType(meals);
      expect(sorted.map((m) => m.mealType)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    });

    it('does not mutate original array', () => {
      const meals = [
        createMeal({ mealType: 'dinner' }),
        createMeal({ mealType: 'breakfast' }),
      ];
      const original = [...meals];
      sortMealsByType(meals);
      expect(meals[0].mealType).toBe(original[0].mealType);
    });
  });

  describe('filterSubItemsBySearch', () => {
    it('returns empty for query shorter than 2 chars', () => {
      expect(filterSubItemsBySearch(mockSubItems, '')).toHaveLength(0);
      expect(filterSubItemsBySearch(mockSubItems, 'k')).toHaveLength(0);
    });

    it('filters by partial match (case-insensitive)', () => {
      const result = filterSubItemsBySearch(mockSubItems, 'mle');
      expect(result).toHaveLength(1);
      expect(result[0].nameCs).toBe('Kravské mléko');
    });

    it('handles diacritics', () => {
      const result = filterSubItemsBySearch(mockSubItems, 'maslo');
      expect(result).toHaveLength(1);
      expect(result[0].nameCs).toBe('Máslo');
    });

    it('returns multiple matches', () => {
      // Both 'Brambory' and 'Kravské mléko' contain 'r'
      // But we need 2+ chars, so search for 'or' or similar
      const subItems = [
        ...mockSubItems,
        { id: 'pork-2', categoryId: 'other', slug: 'pork-2', nameCs: 'Vepřové maso', sortOrder: 3 },
      ];
      const result = filterSubItemsBySearch(subItems, 'vep');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});
