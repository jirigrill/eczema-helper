import type { GeneratedSchedule } from '$lib/domain/models';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';
import { type AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';

export class DexieScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(schedule: GeneratedSchedule): Promise<void> {
    await this.db.schedule.put({ id: SINGLETON_ID, ...schedule });
  }

  async load(): Promise<GeneratedSchedule | null> {
    const row = await this.db.schedule.get(SINGLETON_ID);
    if (!row) return null;
    const { id: _id, ...schedule } = row;
    return schedule;
  }
}
