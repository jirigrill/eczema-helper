import { db } from '$lib/db/atopic-db';
import { DexieSkinPhotoStore } from '$lib/adapters/dexie-skin-photo-store';
import { todayIso } from '$lib/utils/date';
import { createDateScopedSession } from '$lib/stores/date-scoped-session';
import type { SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const store = new DexieSkinPhotoStore(db);

export function createSkinPhotoSession(date: string) {
	const photos = createDateScopedSession(db.photos, date);

	async function save(photo: SkinPhoto): Promise<Result<void, string>> {
		return store.save(photo);
	}

	return { subscribe: photos.subscribe, save };
}

export const skinPhotoSession = createSkinPhotoSession(todayIso());
