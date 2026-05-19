import type { GeneratedSchedule } from '$lib/domain/models';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';
import type { Result } from '$lib/types/result';

export class InMemoryScheduleRepository implements ScheduleRepository {
  private _data: GeneratedSchedule | null = null;

  async save(schedule: GeneratedSchedule): Promise<Result<void, string>> {
    this._data = schedule;
    return { ok: true, data: undefined };
  }

  async load(): Promise<Result<GeneratedSchedule | null, string>> {
    return { ok: true, data: this._data };
  }
}
