import type { HarvestCandidate, HarvestCandidateStatus } from '$lib/domain/harvest-candidate';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieHarvestCandidateRepository {
  constructor(private readonly db: AtopicDb) {}

  async upsert(candidate: HarvestCandidate): Promise<Result<void, string>> {
    try {
      await this.db.harvest_candidates.put(candidate);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async readByKey(normalizedKey: string): Promise<Result<HarvestCandidate | null, string>> {
    try {
      const row = await this.db.harvest_candidates.get(normalizedKey);
      return { ok: true, data: row ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listAll(): Promise<Result<HarvestCandidate[], string>> {
    try {
      const rows = await this.db.harvest_candidates.toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listByStatus(status: HarvestCandidateStatus): Promise<Result<HarvestCandidate[], string>> {
    try {
      const rows = await this.db.harvest_candidates.where('status').equals(status).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
