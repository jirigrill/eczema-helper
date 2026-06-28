import { readable, type Readable } from 'svelte/store';
import { liveQuery } from 'dexie';
import { db } from '$lib/db/atopic-db';
import type { SkinPhoto } from '$lib/domain/models';

/**
 * Read-only session over a day's photos. Joins `skin_observations` (where date
 * matches) with `photos` (where observationId is one of the day's observation
 * ids). Writes happen via `DexieSkinObservationRepository.save`, which inserts
 * observation + photos atomically; there is no standalone photo write path.
 *
 * Dexie's `liveQuery` re-runs the async callback whenever any table it touches
 * is mutated, so subscribers get reactive updates after Uložit on /skin.
 */
export function createSkinPhotoSession(date: string): Readable<SkinPhoto[]> {
	return readable<SkinPhoto[]>([], (set) => {
		const subscription = liveQuery(async () => {
			const observations = await db.skin_observations
				.where('date')
				.equals(date)
				.toArray();
			if (observations.length === 0) return [] as SkinPhoto[];
			const observationIds = observations.map((o) => o.id);
			return db.photos.where('observationId').anyOf(observationIds).toArray();
		}).subscribe({
			next: (rows) => {
				set(rows ?? []);
			},
			error: () => {
				set([]);
			},
		});
		return () => subscription.unsubscribe();
	});
}

export const skinPhotoSession: Readable<SkinPhoto[]> = createSkinPhotoSession('');
