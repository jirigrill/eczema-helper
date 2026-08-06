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
 * subscription the same way the day view subscribes to its per-date data, so
 * logging onto a day earlier than any existing entry grows the day strip
 * immediately without a reload.
 */
export function createEarliestLoggedStore(): Readable<string | null> {
  return readable<string | null>(null, (set) => {
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
}
