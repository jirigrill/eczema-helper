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
 * A malformed param redirects to today. Since the day strip now spans past and
 * future edges (issue #654), a future day is a normal, fully-loggable day: a
 * valid future param renders its own day rather than redirecting. Any valid
 * date — past or future — renders its own day; the strip may not reach it, but
 * a directly-navigated day still renders (the range clamps outward to it).
 *
 * No reactive subscriptions — compose this inside a .svelte.ts shell.
 */
export function resolveDay(param: string, seeded: boolean, today: string): DayViewCore {
  if (!seeded) {
    return { selectedDate: today, redirectTo: null };
  }
  if (!isIsoDate(param)) {
    return { selectedDate: today, redirectTo: today };
  }
  return { selectedDate: param, redirectTo: null };
}
