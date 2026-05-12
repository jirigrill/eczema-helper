import { readable } from "svelte/store";
import { liveQuery } from "dexie";

import { db, SINGLETON_ID } from "$lib/db/atopic-db";
import type { GeneratedSchedule } from "$lib/domain/models";
import type { Readable } from "svelte/store";

export const scheduleStore: Readable<GeneratedSchedule | null> = readable(
  null as GeneratedSchedule | null,
  (set) => {
    const subscription = liveQuery(() =>
      db.schedule.get(SINGLETON_ID),
    ).subscribe({
      next: (row) => set((row as GeneratedSchedule) ?? null),
      error: () => set(null),
    });
    return () => subscription.unsubscribe();
  },
);
