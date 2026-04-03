import type { Meal, MealItem } from '$lib/domain/models';

export type MealWithItems = Meal & { items: MealItem[] };

let _meals = $state<MealWithItems[]>([]);
let _loading = $state(false);
let _error = $state<string | null>(null);

export const mealsStore = {
  get meals() {
    return _meals;
  },
  get loading() {
    return _loading;
  },
  get error() {
    return _error;
  },

  setMeals(meals: MealWithItems[]) {
    _meals = meals;
  },

  /**
   * Load meals for a specific date.
   */
  async loadForDate(date: string): Promise<void> {
    _loading = true;
    _error = null;

    try {
      const res = await fetch(`/api/meals?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          _meals = json.data;
        } else {
          _error = json.error;
        }
      } else {
        _error = 'Chyba při načítání jídel';
      }
    } catch (err) {
      _error = err instanceof Error ? err.message : 'Chyba při načítání';
    } finally {
      _loading = false;
    }
  },

  /**
   * Create a new meal.
   */
  async createMeal(
    date: string,
    mealType: string,
    items: Partial<MealItem>[],
    label?: string
  ): Promise<MealWithItems | null> {
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mealType, label, items }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          const newMeal: MealWithItems = json.data;
          _meals = [..._meals, newMeal];
          return newMeal;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Update an existing meal.
   */
  async updateMeal(
    id: string,
    updates: { mealType?: string; label?: string; items?: Partial<MealItem>[] }
  ): Promise<MealWithItems | null> {
    try {
      const res = await fetch(`/api/meals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          const updatedMeal: MealWithItems = json.data;
          _meals = _meals.map((m) => (m.id === id ? updatedMeal : m));
          return updatedMeal;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Delete a meal.
   */
  async deleteMeal(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        _meals = _meals.filter((m) => m.id !== id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Clear meals (when changing date).
   */
  clear() {
    _meals = [];
    _error = null;
  },
};
