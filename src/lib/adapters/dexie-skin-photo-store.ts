import type { AtopicDb } from '$lib/db/atopic-db';
import type { SkinPhoto } from '$lib/domain/models';
import type { SkinPhotoStore } from '$lib/domain/ports/skin-photo-store';
import type { Result } from '$lib/types/result';

export class DexieSkinPhotoStore implements SkinPhotoStore {
  constructor(private readonly db: AtopicDb) {}

  async listByObservationId(observationId: string): Promise<Result<SkinPhoto[], string>> {
    try {
      const rows = await this.db.photos.where('observationId').equals(observationId).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
