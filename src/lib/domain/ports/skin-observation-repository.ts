import type { SkinObservation, SkinPhotoInput } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinObservationRepository = {
  /**
   * Atomically persist an observation and its photos. The adapter mints
   * id/observationId/capturedAt for each SkinPhotoInput before writing.
   * Both tables commit or neither does.
   */
  save(observation: SkinObservation, photos: SkinPhotoInput[]): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
};
