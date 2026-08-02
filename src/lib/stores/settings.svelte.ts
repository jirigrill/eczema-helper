import { fromStore } from 'svelte/store';

import { DexieSettingsRepository } from '$lib/adapters/dexie-settings-repository';
import { db } from '$lib/db/atopic-db';
import type { FeedingStage } from '$lib/domain/models';
import { settingsContext } from '$lib/stores/settings-context';
import type { Result } from '$lib/types/result';

const settingsRepo = new DexieSettingsRepository(db);

/**
 * Live settings store: owns the feeding-stage read and the setFeedingStage
 * write. Reads ride the `settingsContext` liveQuery shell so the value tracks
 * the settings singleton; the write goes through the `SettingsRepository` port.
 *
 * This is a live concern (the feeding stage is the master switch for who may be
 * logged, #567) and lives here rather than in the parking-bound protocol session
 * store.
 */
function createSettingsStore() {
  const context = fromStore(settingsContext);

  async function setFeedingStage(feedingStage: FeedingStage): Promise<Result<void, string>> {
    // Standalone current-value update through the SettingsRepository port.
    const current = await settingsRepo.load();
    if (!current.ok) return current;
    // Preserve any other settings on the existing row; fall back to an empty
    // base when the row is unseeded so future SettingsData fields aren't
    // silently dropped (spreading a `null` row would collapse to just
    // `{ feedingStage }`).
    return settingsRepo.save({ ...(current.data ?? {}), feedingStage });
  }

  return {
    get feedingStage(): FeedingStage | null {
      return context.current?.feedingStage ?? null;
    },
    setFeedingStage,
  };
}

export const settingsStore = createSettingsStore();
