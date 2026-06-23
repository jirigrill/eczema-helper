import type { SkinObservation, SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinObservationRepository = {
  /**
   * Atomically persist an observation along with any photos captured for the
   * regions inside it. Slice 1 (issue #361) always passes an empty array;
   * the photos arm lights up in the next slice. The signature is shaped now
   * so consumers don't have to migrate twice.
   */
  save(observation: SkinObservation, photos: SkinPhoto[]): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
};
