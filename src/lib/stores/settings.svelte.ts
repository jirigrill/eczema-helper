import { fromStore, readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { DexieSettingsRepository } from '$lib/adapters/dexie-settings-repository';
import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import type { FeedingStage } from '$lib/domain/models';
import { settingsContext } from '$lib/stores/settings-context';
import type { Result } from '$lib/types/result';

const settingsRepo = new DexieSettingsRepository(db);

/**
 * Seeded signal for the descaled app (PRD #623, §3): `settings.feedingStage`
 * is the sole "is the mother set up?" gate, replacing the parked schedule's
 * `ctx.status`. Like `scheduleRaw`, it is a tri-state that *holds at `loading`*
 * until the settings liveQuery has emitted at least once — the layout must not
 * treat the initial pre-emission tick as `unset`, or it would bounce a seeded
 * user from `/day/<today>` to `/` and back (the #353 redirect race).
 *
 *  - `loading` — no emission yet; hold, do not redirect.
 *  - `unset`   — a real emission with no `feedingStage`; route to first run (`/`).
 *  - `seeded`  — a real emission carrying a `feedingStage`; route to the day view.
 */
export type SeededStatus = 'loading' | 'unset' | 'seeded';

export const seededStatus = readable<SeededStatus>('loading', (set) => {
  const subscription = liveQuery(() => db.settings.get(SINGLETON_ID)).subscribe({
    next: (row) => set(row?.feedingStage != null ? 'seeded' : 'unset'),
    // A read error means we cannot prove the mother is set up; treat it as
    // unset so she lands on first run rather than being stranded on a blank
    // day view.
    error: () => set('unset'),
  });

  return () => subscription.unsubscribe();
});

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
