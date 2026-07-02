import { randomUUID } from '$lib/utils/uuid';
import type { SkinObservation, SkinPhoto, SkinPhotoInput } from '$lib/domain/models';
import type {
  SkinObservationRepository,
  SkinObservationUpdateOptions,
} from '$lib/domain/ports/skin-observation-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieSkinObservationRepository implements SkinObservationRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(
    observation: SkinObservation,
    inputs: SkinPhotoInput[],
  ): Promise<Result<void, string>> {
    try {
      const photos = mintPhotos(observation.id, inputs);

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

  async update(
    observation: SkinObservation,
    options: SkinObservationUpdateOptions,
  ): Promise<Result<void, string>> {
    try {
      const photosToAdd = mintPhotos(observation.id, options.addPhotos);

      await this.db.transaction(
        'rw',
        this.db.skin_observations,
        this.db.photos,
        async () => {
          const existing = await this.db.skin_observations.get(observation.id);
          const merged: SkinObservation = {
            ...observation,
            createdAt: existing?.createdAt ?? observation.createdAt,
          };
          await this.db.skin_observations.put(merged);
          if (options.removePhotoIds.length > 0) {
            await this.db.photos.bulkDelete(options.removePhotoIds);
          }
          if (photosToAdd.length > 0) {
            await this.db.photos.bulkPut(photosToAdd);
          }
        },
      );
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async remove(id: string): Promise<Result<void, string>> {
    try {
      await this.db.transaction(
        'rw',
        this.db.skin_observations,
        this.db.photos,
        async () => {
          await this.db.photos.where('observationId').equals(id).delete();
          await this.db.skin_observations.delete(id);
        },
      );
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async restore(
    observation: SkinObservation,
    photos: SkinPhoto[],
  ): Promise<Result<void, string>> {
    try {
      await this.db.transaction(
        'rw',
        this.db.skin_observations,
        this.db.photos,
        async () => {
          for (const photo of photos) {
            const existing = await this.db.photos.get(photo.id);
            if (existing && existing.observationId !== observation.id) {
              throw new Error(
                `photo id ${photo.id} already belongs to a different observation`,
              );
            }
          }
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

function mintPhotos(observationId: string, inputs: SkinPhotoInput[]): SkinPhoto[] {
  const now = new Date().toISOString();
  return inputs.map((input) => ({
    id: randomUUID(),
    observationId,
    region: input.region,
    capturedAt: now,
    blob: input.blob,
  }));
}
