import { writable } from 'svelte/store';

import type {
  Actor,
  MealSlot,
  MealType,
  SkinObservation,
  SkinPhoto,
  SkinPhotoInput,
} from '$lib/domain/models';
import type { WorkingMeal } from '$lib/domain/working-meal';

/**
 * Discriminated union of everything that can land in the in-memory discard
 * buffer (issue #277 / ADR-0018 / ADR-0021 amendment). Each `kind` names both
 * the domain (`meal-*` vs `skin-*`) and the action (compose / edit / delete)
 * so the layout-level toast, the meal route, and the skin route can each
 * ignore descriptors that don't belong to them without runtime shape checks.
 *
 * Store still holds at most one descriptor at a time — writing a new one
 * discards whatever was there before.
 */
export type MealDiscardKind = 'meal-compose' | 'meal-edit' | 'meal-delete';
export type SkinDiscardKind = 'skin-edit' | 'skin-delete';
export type DiscardKind = MealDiscardKind | SkinDiscardKind | 'meal-copy';

export type DiscardedMeal = {
  kind: MealDiscardKind;
  workingMeal: WorkingMeal;
  mealType: MealType;
  /**
   * The actor whose slot the buffered meal belongs to (issue #588). A slot is
   * keyed `date:mealType:actor`, so mother and baby occupy distinct rows in the
   * same visual slot. Without this, the layout-level undo rebuilt the `/meal`
   * URL with no `?actor=`, so the return navigation defaulted `selectedActor` to
   * `mother` — undoing a baby edit/delete landed on mother and could clobber
   * mother's real row with the restored baby working meal.
   */
  actor: Actor;
  /**
   * Original day the buffered meal belongs to (issue #323). Without this,
   * the layout-level undo had no way to reconstruct `?date=` and fell
   * through to today, silently moving deleted/discarded meals forward by
   * however many days the user was browsing back.
   */
  date: string;
  returnTo: string;
};

/**
 * Undo descriptor for a copy-meal (spec #599, issue #606). Unlike the other
 * meal descriptors it carries no `WorkingMeal` snapshot — a copy's undo is a
 * *reversal* of the write it just made against the destination slot, not a
 * rehydrate of a discarded draft. The layout's `handleDiscardUndo` routes this
 * kind to a copy-reversal path (never the generic `/meal` rehydrate):
 *  - `destinationPreexisted === false` → the copy created the slot, so undo
 *    removes it entirely.
 *  - `destinationPreexisted === true` → the copy merged into an existing meal,
 *    so undo removes only the `addedItemIds` it added and restores
 *    `priorUpdatedAt` (unsetting it when it was previously unset). The
 *    destination's prior foods and note are left untouched.
 */
export type DiscardedMealCopy = {
  kind: 'meal-copy';
  /** The destination slot the copy wrote to — the reversal target. */
  destinationSlot: MealSlot;
  /** Ids of the items the copy added; the only items an undo may remove. */
  addedItemIds: string[];
  /** Whether a meal already occupied the destination slot before the copy. */
  destinationPreexisted: boolean;
  /** The destination's `updatedAt` before the merge, restored on undo. */
  priorUpdatedAt: string | undefined;
  /** Origin day + return path, mirroring the navigation contract of the other descriptors. */
  date: string;
  returnTo: string;
};

export type DiscardedSkinEdit = {
  kind: 'skin-edit';
  observationId: string;
  observation: SkinObservation;
  addPhotos: SkinPhotoInput[];
  removePhotoIds: string[];
  date: string;
  returnTo: string;
};

export type DiscardedSkinDelete = {
  kind: 'skin-delete';
  observationId: string;
  observation: SkinObservation;
  addPhotos: SkinPhotoInput[];
  removePhotoIds: string[];
  /**
   * Full photo rows (blob + metadata) captured at the moment of delete so an
   * undo re-materializes the observation with every original photo. Kept in
   * memory only for the buffer's lifetime — see ADR-0021 amendment.
   */
  photoBlobs: SkinPhoto[];
  date: string;
  returnTo: string;
};

export type DiscardDescriptor =
  | DiscardedMeal
  | DiscardedMealCopy
  | DiscardedSkinEdit
  | DiscardedSkinDelete;

export const discardBuffer = writable<DiscardDescriptor | null>(null);

export function writeBuffer(snapshot: DiscardDescriptor): void {
  discardBuffer.set(snapshot);
}

export function clearBuffer(): void {
  discardBuffer.set(null);
}
