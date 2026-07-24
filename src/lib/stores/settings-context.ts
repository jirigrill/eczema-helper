import { readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import type { SettingsData } from '$lib/domain/models';

/**
 * liveQuery shell over the `settings` singleton, mirroring `scheduleContext`.
 * Emits `null` until the row is seeded (onboarding completion) and re-emits on
 * every change, so consumers see the live feedingStage master switch (#567).
 */
export const settingsContext = readable<SettingsData | null>(null, (set) => {
  const subscription = liveQuery(() => db.settings.get(SINGLETON_ID)).subscribe({
    next: (row) => {
      if (!row) {
        set(null);
        return;
      }
      const { id: _id, ...settings } = row;
      set(settings);
    },
    error: () => set(null),
  });

  return () => subscription.unsubscribe();
});
