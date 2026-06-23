import { db } from '$lib/db/atopic-db';
import { DexieSkinObservationRepository } from '$lib/adapters/dexie-skin-observation-repository';
import { todayIso } from '$lib/utils/date';
import { createDateScopedSession } from '$lib/stores/date-scoped-session';
import type { SkinObservation, SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const repo = new DexieSkinObservationRepository(db);

export function createSkinObservationSession(date: string) {
	const observations = createDateScopedSession(db.skin_observations, date);

	async function save(
		observation: SkinObservation,
		photos: SkinPhoto[] = [],
	): Promise<Result<void, string>> {
		return repo.save(observation, photos);
	}

	return { subscribe: observations.subscribe, save };
}

export const skinObservationSession = createSkinObservationSession(todayIso());
