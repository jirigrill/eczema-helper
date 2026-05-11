import type { GeneratedSchedule } from '$lib/domain/models';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';

export class InMemoryScheduleRepository implements ScheduleRepository {
  private _data: GeneratedSchedule | null = null;

  async save(schedule: GeneratedSchedule): Promise<void> {
    this._data = schedule;
  }

  async load(): Promise<GeneratedSchedule | null> {
    return this._data;
  }
}
