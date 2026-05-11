import type { GeneratedSchedule } from '$lib/domain/models';

export type ScheduleRepository = {
  save(schedule: GeneratedSchedule): Promise<void>;
  load(): Promise<GeneratedSchedule | null>;
};
