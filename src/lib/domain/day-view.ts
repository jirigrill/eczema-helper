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
