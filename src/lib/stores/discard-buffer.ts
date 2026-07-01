import { writable } from 'svelte/store';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type {
  MealType,
  SkinObservation,
  SkinPhoto,
  SkinPhotoInput,
} from '$lib/domain/models';

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
export type DiscardKind = MealDiscardKind | SkinDiscardKind;

export type DiscardedMeal = {
  kind: MealDiscardKind;
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

export type DiscardDescriptor = DiscardedMeal | DiscardedSkinEdit | DiscardedSkinDelete;

export const discardBuffer = writable<DiscardDescriptor | null>(null);

export function writeBuffer(snapshot: DiscardDescriptor): void {
  discardBuffer.set(snapshot);
}

export function clearBuffer(): void {
  discardBuffer.set(null);
}
