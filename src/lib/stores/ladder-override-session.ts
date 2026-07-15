import { readable } from 'svelte/store';
import type { Readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { db } from '$lib/db/atopic-db';
import type { Ladder } from '$lib/domain/canonical-allergen';

/**
 * Reactive per-allergen ladder-override subscription. Emits the stored
 * `Ladder` for `allergenId` (or `null` when nothing is stored), tracked live
 * so writes to the `ladder_overrides` store push new values to subscribers.
 *
 * Shape mirrors `createMealSession` — a Svelte `Readable` wrapping a Dexie
 * `liveQuery`, so consumers plug into the store API without knowing about
 * IndexedDB.
 */
export function createLadderOverrideSession(allergenId: string): Readable<Ladder | null> {
  return readable<Ladder | null>(null, (set) => {
    const subscription = liveQuery(() =>
      db.ladder_overrides.get(allergenId).then((row) => row ?? null),
    ).subscribe({
      next: (row) => {
        set(row ?? null);
      },
      error: () => {
        set(null);
      },
    });
    return () => subscription.unsubscribe();
  });
}
