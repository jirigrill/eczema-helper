import { type AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';
import type { GeneratedSchedule } from '$lib/domain/models';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';
import type { Result } from '$lib/types/result';

export class DexieScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(schedule: GeneratedSchedule): Promise<Result<void, string>> {
    try {
      await this.db.schedule.put({ id: SINGLETON_ID, ...schedule });
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async load(): Promise<Result<GeneratedSchedule | null, string>> {
    try {
      const row = await this.db.schedule.get(SINGLETON_ID);
      if (!row) return { ok: true, data: null };
      const { id: _id, ...schedule } = row;
      return { ok: true, data: schedule };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
