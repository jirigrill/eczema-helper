import { readable, type Readable } from 'svelte/store';
import type { SkinPhoto } from '$lib/domain/models';

// Photos are now written atomically via DexieSkinObservationRepository.save.
// A standalone photo save path no longer exists. The day view's photo panel
// will show zero until the final slice re-wires it via listByObservationId.
export function createSkinPhotoSession(_date: string): Readable<SkinPhoto[]> {
	return readable<SkinPhoto[]>([]);
}

export const skinPhotoSession: Readable<SkinPhoto[]> = createSkinPhotoSession('');
