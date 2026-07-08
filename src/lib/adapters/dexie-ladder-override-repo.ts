import type { Ladder } from '$lib/domain/canonical-allergen';
import type { LadderOverrideRepository } from '$lib/domain/ports/ladder-override-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieLadderOverrideRepo implements LadderOverrideRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(override: Ladder): Promise<Result<void, string>> {
    try {
      await this.db.ladder_overrides.put(override);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async loadByAllergen(allergenId: string): Promise<Result<Ladder | null, string>> {
    try {
      const row = await this.db.ladder_overrides.get(allergenId);
      return { ok: true, data: row ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
