import type { RegionLevel, SchedulePhase, SkinObservation } from '$lib/domain/models';
import { overallSeverity } from '$lib/domain/models';
import { addDays, daysBetween } from '$lib/utils/date';

export type RecapRow = {
  /** ISO date for this dose day. */
  date: string;
  /** 1-indexed dose day position within the phase. */
  dayNumber: number;
  /**
   * Derived day-overall severity for this dose day, or `undefined` when the
   * day has no observation. Computed as `max(regions)` over the latest
   * observation logged on the day (issue #361). Never persisted.
   */
  severity?: RegionLevel;
};

/**
 * Builds the "Průběh testu" recap shown on `/evaluation` after a reintroduction
 * phase ends — one row per dose day in the phase window with the day's
 * 1-indexed number, date, and overall skin severity.
 *
 * Recap-specific shape; not a general-purpose daily-severity dataset. The
 * dayNumber and gap-day fill (severity: undefined for unmonitored days) are
 * UI concerns of the recap strip.
 *
 * Rules:
 *   - One row per day in [startDate, endDate], inclusive — gap days kept.
 *   - Observations outside the window are dropped.
 *   - Multi-obs days: latest by createdAt wins.
 *   - Severity is derived as max(regions[].level), never persisted.
 *
 * Returns [] when phase.endDate is missing (incomplete schedule).
 */
export function buildPhaseRecap(phase: SchedulePhase, observations: SkinObservation[]): RecapRow[] {
  if (!phase.endDate) return [];

  const totalDays = daysBetween(phase.startDate, phase.endDate);
  const latestByDate = new Map<string, SkinObservation>();
  for (const o of observations) {
    if (o.date < phase.startDate || o.date > phase.endDate) continue;
    const prior = latestByDate.get(o.date);
    if (!prior || o.createdAt > prior.createdAt) latestByDate.set(o.date, o);
  }

  const rows: RecapRow[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(phase.startDate, i);
    const latest = latestByDate.get(date);
    rows.push({
      date,
      dayNumber: i + 1,
      ...(latest ? { severity: overallSeverity(latest) } : {}),
    });
  }
  return rows;
}
