import type { SkinObservation, SkinPhoto, SkinPhotoInput } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinObservationUpdateOptions = {
  addPhotos: SkinPhotoInput[];
  removePhotoIds: string[];
};

export type SkinObservationRepository = {
  /**
   * Atomically persist an observation and its photos. The adapter mints
   * id/observationId/capturedAt for each SkinPhotoInput before writing.
   * Both tables commit or neither does.
   */
  save(observation: SkinObservation, photos: SkinPhotoInput[]): Promise<Result<void, string>>;
  /**
   * Overwrite the observation row's `regions`, `notes`, and photo set in one
   * transaction. Preserves the row's `id` and `createdAt` (the witnessing
   * moment per ADR-0021). Photos in `addPhotos` are minted and inserted;
   * photos whose id is in `removePhotoIds` are deleted.
   */
  update(
    observation: SkinObservation,
    options: SkinObservationUpdateOptions,
  ): Promise<Result<void, string>>;
  /**
   * Hard-delete the observation and cascade to all its SkinPhoto rows in one
   * transaction. Partial failure leaves the tables in their pre-remove state.
   */
  remove(id: string): Promise<Result<void, string>>;
  /**
   * Reinsert an observation with preserved identity (post-delete-undo path).
   * Unlike `save`, photos carry their original `id`, `observationId`, and
   * `capturedAt` — nothing is minted. Rejects if any incoming photo id
   * already belongs to a different observation (defensive guard against
   * caller-side bugs). Both tables commit or neither does.
   */
  restore(observation: SkinObservation, photos: SkinPhoto[]): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
};
