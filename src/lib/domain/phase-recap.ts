import type { SchedulePhase, SkinObservation, RegionLevel } from '$lib/domain/models';
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
 * Pure join of a phase's dose days with the skin observations logged in
 * that window — the "Průběh testu" recap shown on `/evaluation`.
 *
 * Days with no observation render with `severity: undefined`. When a day
 * has multiple observations, the latest by `createdAt` wins; severity is
 * derived from its regions array (`overallSeverity`), never persisted.
 */
export function buildPhaseRecap(
  phase: SchedulePhase,
  observations: SkinObservation[],
): RecapRow[] {
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
