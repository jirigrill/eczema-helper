import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db } from '$lib/db/atopic-db';
import { DexieSkinObservationRepository } from '$lib/adapters/dexie-skin-observation-repository';
import { todayIso } from '$lib/utils/date';
import type { SkinObservation } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const repo = new DexieSkinObservationRepository(db);

export function createSkinObservationSession(date: string) {
	const observations = readable<SkinObservation[]>([], (set) => {
		const subscription = liveQuery(() =>
			db.skin_observations.where('date').equals(date).toArray(),
		).subscribe({
			next: (rows) => { set(rows ?? []); },
			error: () => { set([]); },
		});
		return () => subscription.unsubscribe();
	});

	async function save(observation: SkinObservation): Promise<Result<void, string>> {
		return repo.save(observation);
	}

	return { subscribe: observations.subscribe, save };
}

export const skinObservationSession = createSkinObservationSession(todayIso());
