import type { ReintroductionEvaluation } from '$lib/domain/models';
import type { ReintroductionEvaluationRepository } from '$lib/domain/ports/evaluation-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieEvaluationRepository implements ReintroductionEvaluationRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(evaluation: ReintroductionEvaluation): Promise<Result<void, string>> {
    try {
      await this.db.evaluations.put(evaluation);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async loadByPhase(phaseId: string): Promise<Result<ReintroductionEvaluation | null, string>> {
    try {
      const row = await this.db.evaluations.get(phaseId);
      return { ok: true, data: row ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listAll(): Promise<Result<ReintroductionEvaluation[], string>> {
    try {
      const rows = await this.db.evaluations.toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
