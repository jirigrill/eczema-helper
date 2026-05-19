import type { GeneratedSchedule } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type ScheduleRepository = {
  save(schedule: GeneratedSchedule): Promise<Result<void, string>>;
  load(): Promise<Result<GeneratedSchedule | null, string>>;
};
