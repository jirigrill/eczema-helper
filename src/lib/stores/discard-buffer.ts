import { writable } from 'svelte/store';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { MealType } from '$lib/domain/models';

/**
 * What kind of action produced this discard buffer (issue #277, ADR-0018).
 *
 * The layout-level toast picks its message from `kind`, not from anything it
 * could derive on its own — by the time the toast renders, the meal page is
 * already unmounted and the only context the layout has is what the buffer
 * carries.
 *
 * - `compose` → "Jídlo neuloženo" (a fresh draft was discarded)
 * - `edit`    → "Změny neuloženy" (unsaved edits to a saved meal were dropped)
 * - `delete`  → "Jídlo smazáno"   (the saved meal was removed; undo re-saves)
 */
export type DiscardKind = 'compose' | 'edit' | 'delete';

export type DiscardedMeal = {
  kind: DiscardKind;
  workingMeal: WorkingMeal;
  mealType: MealType;
  /**
   * Original day the buffered meal belongs to (issue #323). Without this,
   * the layout-level undo had no way to reconstruct `?date=` and fell
   * through to today, silently moving deleted/discarded meals forward by
   * however many days the user was browsing back.
   */
  date: string;
  returnTo: string;
};

export const discardBuffer = writable<DiscardedMeal | null>(null);

export function writeBuffer(snapshot: DiscardedMeal): void {
  discardBuffer.set(snapshot);
}

export function clearBuffer(): void {
  discardBuffer.set(null);
}
