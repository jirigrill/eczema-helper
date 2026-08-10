import { readable } from 'svelte/store';
import type { Readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { earlierLoggedDate } from '$lib/domain/earliest-logged';
import { mealRepository } from '$lib/stores/meal-session';
import { skinObservationRepository } from '$lib/stores/skin-observation-session';

/**
 * Live earliest logged day across meals and skin observations — the earlier of
 * the two ports' answers, null when nothing is logged (§3a). The imperative
 * shell over the pure `earlierLoggedDate` core: it owns the `liveQuery`
 * subscription so logging onto a day earlier than any existing entry grows the
 * day strip immediately without a reload.
 *
 * This is an **app-wide singleton**, not a date-scoped factory: its value is
 * global (the earliest day across *all* entries), so both consumers — the day
 * view store and the meal route — share one subscription rather than each
 * spinning up its own. See the factory-vs-singleton rule in
 * `docs/architecture/ports-and-adapters.md` § Stores layer.
 */
export const earliestLoggedStore: Readable<string | null> = readable<string | null>(null, (set) => {
  const subscription = liveQuery(async () => {
    const [mealResult, skinResult] = await Promise.all([
      mealRepository.earliestLoggedDate(),
      skinObservationRepository.earliestLoggedDate(),
    ]);
    const mealDate = mealResult.ok ? mealResult.data : null;
    const skinDate = skinResult.ok ? skinResult.data : null;
    return earlierLoggedDate(mealDate, skinDate);
  }).subscribe({
    next: (value) => set(value),
    error: () => set(null),
  });
  return () => subscription.unsubscribe();
});
