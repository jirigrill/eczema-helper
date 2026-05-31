import { liveQuery } from 'dexie';
import type { Observable } from 'dexie';
import type { SkinPhoto } from '$lib/domain/models';
import type { SkinPhotoStore } from '$lib/domain/ports/skin-photo-store';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieSkinPhotoStore implements SkinPhotoStore {
  constructor(private readonly db: AtopicDb) {}

  async save(photo: SkinPhoto): Promise<Result<void, string>> {
    try {
      await this.db.photos.put(photo);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listByDate(date: string): Promise<Result<SkinPhoto[], string>> {
    try {
      const rows = await this.db.photos.where('date').equals(date).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  liveQueryByDate(date: string): Observable<SkinPhoto[]> {
    return liveQuery(() => this.db.photos.where('date').equals(date).toArray());
  }
}
