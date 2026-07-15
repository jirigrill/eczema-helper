import { toMealItems } from '$lib/domain/working-meal';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { MealItem } from '$lib/domain/models';

type ComparableItem = {
  name: string;
  foodId: string;
  amount: string;
  preparationMethod?: string;
};

export type MealSnapshot = { items: ComparableItem[]; notes: string };

export function snapshotOf(meal: WorkingMeal, notes: string): MealSnapshot {
  const items: ComparableItem[] = toMealItems(meal).map((i: MealItem) => ({
    name: i.name,
    foodId: i.foodId,
    amount: i.amount,
    preparationMethod: i.preparationMethod,
  }));
  return { items, notes: notes.trim() };
}

export function snapshotsEqual(a: MealSnapshot, b: MealSnapshot): boolean {
  if (a.notes !== b.notes) return false;
  if (a.items.length !== b.items.length) return false;
  // Order-independent: editing reorders foods; same set of foodIds with
  // same amounts/preparations is "clean" regardless of order.
  const key = (i: ComparableItem) => `${i.foodId}${i.name}${i.amount}${i.preparationMethod ?? ''}`;
  const av = a.items.map(key).sort();
  const bv = b.items.map(key).sort();
  return av.every((k, idx) => k === bv[idx]);
}
