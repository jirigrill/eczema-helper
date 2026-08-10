import { fromStore } from 'svelte/store';

import { DexieSettingsRepository } from '$lib/adapters/dexie-settings-repository';
import { db } from '$lib/db/atopic-db';
import type { FeedingStage } from '$lib/domain/models';
import { type SettingsState, settingsContext } from '$lib/stores/settings-context';
import type { Result } from '$lib/types/result';

const settingsRepo = new DexieSettingsRepository(db);

/**
 * Live settings store: owns the feeding-stage read, the seeded-status read,
 * and the setFeedingStage write. Reads ride the `settingsContext` liveQuery
 * shell — a single subscription backs both `feedingStage` and `status` — so
 * the write goes through the `SettingsRepository` port.
 *
 * `status` is the seeded signal for the descaled app (PRD #623, §3):
 * `settings.feedingStage` is the sole "is the mother set up?" gate. It holds
 * at `loading` until the settings liveQuery has emitted at least once — the
 * layout must not treat the initial pre-emission tick as `unset`, or it would
 * bounce a seeded user from `/day/<today>` to `/` and back (the #353 redirect
 * race).
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
      const state = context.current;
      return state.status === 'seeded' ? state.settings.feedingStage : null;
    },
    get status(): SettingsState['status'] {
      return context.current.status;
    },
    setFeedingStage,
  };
}

export const settingsStore = createSettingsStore();
