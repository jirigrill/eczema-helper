import { readable } from 'svelte/store';
import type { Readable } from 'svelte/store';

import { liveQuery } from 'dexie';
import type { EntityTable } from 'dexie';

export function createDateScopedSession<T extends { id: string; date: string }>(
  table: EntityTable<T, 'id'>,
  date: string,
): Readable<T[]> {
  return readable<T[]>([], (set) => {
    const subscription = liveQuery(() => table.where('date').equals(date).toArray()).subscribe({
      next: (rows) => {
        set(rows ?? []);
      },
      error: () => {
        set([]);
      },
    });
    return () => subscription.unsubscribe();
  });
}
