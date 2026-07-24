import { type AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';
import type { SettingsData } from '$lib/domain/models';
import type { SettingsRepository } from '$lib/domain/ports/settings-repository';
import type { Result } from '$lib/types/result';

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(settings: SettingsData): Promise<Result<void, string>> {
    try {
      await this.db.settings.put({ id: SINGLETON_ID, ...settings });
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async load(): Promise<Result<SettingsData | null, string>> {
    try {
      const row = await this.db.settings.get(SINGLETON_ID);
      if (!row) return { ok: true, data: null };
      const { id: _id, ...settings } = row;
      return { ok: true, data: settings };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
