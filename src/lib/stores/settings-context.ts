import { readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import type { SettingsData } from '$lib/domain/models';

/**
 * The settings singleton's load state. `loading` and `unset` both have no
 * `SettingsData` to offer, but they are not the same thing — the #353 redirect
 * race needs to tell "the liveQuery hasn't emitted yet" from "it emitted and
 * there is no row" apart. Narrowing to `seeded` is the only way to reach
 * `settings`, so `SettingsData.feedingStage` (non-optional) is guaranteed at
 * the type level wherever it's read.
 */
export type SettingsState =
  | { status: 'loading' }
  | { status: 'unset' }
  | { status: 'seeded'; settings: SettingsData };

/**
 * liveQuery shell over the `settings` singleton. Re-emits on every change, so
 * consumers see the live feedingStage master switch (#567).
 */
export const settingsContext = readable<SettingsState>({ status: 'loading' }, (set) => {
  const subscription = liveQuery(() => db.settings.get(SINGLETON_ID)).subscribe({
    next: (row) => {
      if (!row) {
        set({ status: 'unset' });
        return;
      }
      const { id: _id, ...settings } = row;
      set({ status: 'seeded', settings });
    },
    // A read error means we cannot prove the mother is set up; treat it as
    // unset so she lands on first run rather than being stranded on a blank
    // day view.
    error: () => set({ status: 'unset' }),
  });

  return () => subscription.unsubscribe();
});
