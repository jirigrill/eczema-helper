import { isWithinLoggableWindow } from '$lib/domain/policy';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';

/**
 * Error tag returned when a write adapter refuses to persist a record whose
 * `date` falls outside the loggable window (schedule span padded by the
 * BUFFER_BEFORE_START_DAYS / BUFFER_AFTER_END_DAYS constants in `policy.ts`).
 */
export const OUT_OF_WINDOW_ERROR = 'date-outside-loggable-window';

/**
 * Shared guard used by the Dexie meal / skin-observation write adapters.
 *
 * Loads the current schedule through the injected `ScheduleRepository` port
 * (rather than reaching into the Dexie `schedule` table directly) and checks
 * whether `date` falls inside the loggable window.
 *
 * Returns:
 *   - `null` when the write is allowed to proceed — either the date is in
 *     range, or no schedule has been generated yet (pre-program logging is
 *     unguarded to keep onboarding writes possible).
 *   - `OUT_OF_WINDOW_ERROR` when the date is outside the window; the caller
 *     surfaces this as `{ ok: false, error }` and skips its DB write.
 *
 * NB: the guard runs *before* the caller's `db.transaction(...)`. See the
 * caller-side docs on `save`/`update` for the deliberate atomicity trade-off.
 */
export async function checkLoggableWindow(
  scheduleRepo: ScheduleRepository,
  date: string,
): Promise<typeof OUT_OF_WINDOW_ERROR | null> {
  const result = await scheduleRepo.load();
  if (!result.ok) return null; // schedule read failed → be permissive, matches pre-guard behaviour
  const schedule = result.data;
  if (!schedule) return null; // no schedule yet → onboarding write, unguarded
  if (isWithinLoggableWindow(date, schedule.startDate, schedule.estimatedEndDate)) return null;
  return OUT_OF_WINDOW_ERROR;
}
