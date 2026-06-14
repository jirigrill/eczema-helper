import { writable } from 'svelte/store';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { MealType } from '$lib/domain/models';

export type DiscardedMeal = {
  workingMeal: WorkingMeal;
  mealType: MealType;
  returnTo: string;
  /**
   * The slot the working list was hydrated from at capture time. Restored on
   * undo so the occupied-slot exclusion (ADR-0019 MOVE) survives the round-trip.
   */
  loadedFromType?: MealType | null;
};

export const discardBuffer = writable<DiscardedMeal | null>(null);

export function writeBuffer(snapshot: DiscardedMeal): void {
  discardBuffer.set(snapshot);
}

export function clearBuffer(): void {
  discardBuffer.set(null);
}
