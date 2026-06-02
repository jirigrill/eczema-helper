import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db } from '$lib/db/atopic-db';
import { DexieSkinPhotoStore } from '$lib/adapters/dexie-skin-photo-store';
import { todayIso } from '$lib/utils/date';
import type { SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const store = new DexieSkinPhotoStore(db);
const today = todayIso();

const todayPhotos = readable<SkinPhoto[]>([], (set) => {
	const subscription = liveQuery(() =>
		db.photos.where('date').equals(today).toArray(),
	).subscribe({
		next: (rows) => { set(rows ?? []); },
		error: () => { set([]); },
	});
	return () => subscription.unsubscribe();
});

async function save(photo: SkinPhoto): Promise<Result<void, string>> {
	return store.save(photo);
}

export const skinPhotoSession = {
	subscribe: todayPhotos.subscribe,
	save,
};
