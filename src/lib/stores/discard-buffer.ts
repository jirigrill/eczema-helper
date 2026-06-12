import { writable } from 'svelte/store';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { MealType } from '$lib/domain/models';

export type DiscardedMeal = {
  workingMeal: WorkingMeal;
  mealType: MealType;
  returnTo: string;
};

export const discardBuffer = writable<DiscardedMeal | null>(null);

export function writeBuffer(snapshot: DiscardedMeal): void {
  discardBuffer.set(snapshot);
}

export function clearBuffer(): void {
  discardBuffer.set(null);
}
