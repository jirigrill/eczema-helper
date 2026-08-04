import type { Readable } from 'svelte/store';

import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import { DexieSkinObservationRepository } from '$lib/adapters/dexie-skin-observation-repository';
import { DexieSkinPhotoStore } from '$lib/adapters/dexie-skin-photo-store';
import { db } from '$lib/db/atopic-db';
import type { SkinObservation, SkinPhoto, SkinPhotoInput } from '$lib/domain/models';
import type { SkinObservationUpdateOptions } from '$lib/domain/ports/skin-observation-repository';
import type { Result } from '$lib/types/result';
import { todayIso } from '$lib/utils/date';

const repo = new DexieSkinObservationRepository(db);
const photoStore = new DexieSkinPhotoStore(db);

export type SkinObservationSession = {
  subscribe: Readable<SkinObservation[]>['subscribe'];
  save(observation: SkinObservation, photos?: SkinPhotoInput[]): Promise<Result<void, string>>;
  update(
    observation: SkinObservation,
    options: SkinObservationUpdateOptions,
  ): Promise<Result<void, string>>;
  remove(id: string): Promise<Result<void, string>>;
  restore(observation: SkinObservation, photos: SkinPhoto[]): Promise<Result<void, string>>;
  loadPhotos(observationId: string): Promise<Result<SkinPhoto[], string>>;
};

export function createSkinObservationSession(date: string): SkinObservationSession {
  const observations = createDateScopedSession(db.skin_observations, date);

  async function save(
    observation: SkinObservation,
    photos: SkinPhotoInput[] = [],
  ): Promise<Result<void, string>> {
    return repo.save(observation, photos);
  }

  async function update(
    observation: SkinObservation,
    options: SkinObservationUpdateOptions,
  ): Promise<Result<void, string>> {
    return repo.update(observation, options);
  }

  async function remove(id: string): Promise<Result<void, string>> {
    return repo.remove(id);
  }

  async function restore(
    observation: SkinObservation,
    photos: SkinPhoto[],
  ): Promise<Result<void, string>> {
    return repo.restore(observation, photos);
  }

  async function loadPhotos(observationId: string): Promise<Result<SkinPhoto[], string>> {
    return photoStore.listByObservationId(observationId);
  }

  return { subscribe: observations.subscribe, save, update, remove, restore, loadPhotos };
}

export const skinObservationSession: SkinObservationSession =
  createSkinObservationSession(todayIso());
