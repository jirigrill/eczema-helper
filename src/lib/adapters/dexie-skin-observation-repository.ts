import type { SkinObservation } from '$lib/domain/models';
import type { SkinObservationRepository } from '$lib/domain/ports/skin-observation-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieSkinObservationRepository implements SkinObservationRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(observation: SkinObservation): Promise<Result<void, string>> {
    try {
      await this.db.skin_observations.put(observation);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listByDate(date: string): Promise<Result<SkinObservation[], string>> {
    try {
      const rows = await this.db.skin_observations.where('date').equals(date).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
