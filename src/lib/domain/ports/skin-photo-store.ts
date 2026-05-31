import type { Observable } from 'dexie';
import type { SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinPhotoStore = {
  save(photo: SkinPhoto): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinPhoto[], string>>;
  liveQueryByDate(date: string): Observable<SkinPhoto[]>;
};
