import { db } from '$lib/db/atopic-db';
import { DexieSkinObservationRepository } from '$lib/adapters/dexie-skin-observation-repository';
import { DexieSkinPhotoStore } from '$lib/adapters/dexie-skin-photo-store';
import { todayIso } from '$lib/utils/date';
import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import type { SkinObservation, SkinPhoto, SkinPhotoInput } from '$lib/domain/models';
import type { SkinObservationUpdateOptions } from '$lib/domain/ports/skin-observation-repository';
import type { Result } from '$lib/types/result';

const repo = new DexieSkinObservationRepository(db);
const photoStore = new DexieSkinPhotoStore(db);

export function createSkinObservationSession(date: string) {
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

	/** Fetch every photo belonging to an observation, keyed by observationId. */
	async function loadPhotos(observationId: string): Promise<Result<SkinPhoto[], string>> {
		return photoStore.listByObservationId(observationId);
	}

	return { subscribe: observations.subscribe, save, update, remove, loadPhotos };
}

export const skinObservationSession = createSkinObservationSession(todayIso());
