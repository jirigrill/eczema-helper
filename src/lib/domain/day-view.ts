import type { Meal, SkinObservation, SkinPhoto } from '$lib/domain/models';
import { isIsoDate } from '$lib/utils/date';

export type DayViewCore = {
  selectedDate: string;
  redirectTo: string | null;
};

/**
 * Pure resolve core for the /day route.
 * Derives selectedDate and redirectTo from the URL param + the seeded signal.
 *
 * `seeded` is `settings.feedingStage != null` (PRD #623, §3) — the app's
 * "is the mother set up?" gate. When unset, the day route holds on today and
 * the root layout owns the redirect to first run, so this returns today with no
 * redirect (never a stale `/day`).
 *
 * A malformed or future param redirects to today: the day view is a record of
 * what happened, so there is no future day to log onto (PRD #623, §3). Any
 * valid non-future date renders its own day — the day strip may not reach back
 * to it, but a directly-navigated day still renders.
 *
 * No reactive subscriptions — compose this inside a .svelte.ts shell.
 */
export function resolveDay(param: string, seeded: boolean, today: string): DayViewCore {
  if (!seeded) {
    return { selectedDate: today, redirectTo: null };
  }
  if (!isIsoDate(param) || param > today) {
    return { selectedDate: today, redirectTo: today };
  }
  return { selectedDate: param, redirectTo: null };
}

export type DailyRecords = {
  readonly observations: readonly SkinObservation[];
  readonly photos: readonly SkinPhoto[];
  readonly meals: readonly Meal[];
};

/**
 * Daily Completeness — score 0-3 representing how many of the three core record
 * types (skin observation, skin photo, meal-with-content) are present for a day.
 * Each record type contributes at most one point regardless of how many entries
 * exist. A meal counts only when it has at least one item or non-empty notes —
 * an empty slot does not count.
 */
export function dailyCompleteness(records: DailyRecords): number {
  const hasObservation = records.observations.length > 0 ? 1 : 0;
  const hasPhoto = records.photos.length > 0 ? 1 : 0;
  const hasMealContent = records.meals.some(
    (m) => m.items.length > 0 || (m.notes != null && m.notes.trim().length > 0),
  )
    ? 1
    : 0;
  return hasObservation + hasPhoto + hasMealContent;
}
