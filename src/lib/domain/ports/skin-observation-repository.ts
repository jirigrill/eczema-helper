import type { SkinObservation } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SkinObservationRepository = {
  save(observation: SkinObservation): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
};
