import type { SkinPhoto } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinPhotoStore = {
  listByObservationId(observationId: string): Promise<Result<SkinPhoto[], string>>;
};
