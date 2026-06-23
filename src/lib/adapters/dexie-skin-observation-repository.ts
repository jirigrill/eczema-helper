import { randomUUID } from '$lib/utils/uuid';
import type { SkinObservation, SkinPhoto, SkinPhotoInput } from '$lib/domain/models';
import type { SkinObservationRepository } from '$lib/domain/ports/skin-observation-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieSkinObservationRepository implements SkinObservationRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(
    observation: SkinObservation,
    inputs: SkinPhotoInput[],
  ): Promise<Result<void, string>> {
    try {
      const now = new Date().toISOString();
      const photos: SkinPhoto[] = inputs.map((input) => ({
        id: randomUUID(),
        observationId: observation.id,
        region: input.region,
        capturedAt: now,
        blob: input.blob,
      }));

      await this.db.transaction(
        'rw',
        this.db.skin_observations,
        this.db.photos,
        async () => {
          await this.db.skin_observations.put(observation);
          if (photos.length > 0) {
            await this.db.photos.bulkPut(photos);
          }
        },
      );
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listByDate(date: string): Promise<Result<SkinObservation[], string>> {
    try {
      const rows = await this.db.skin_observations.where('date').equals(date).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
