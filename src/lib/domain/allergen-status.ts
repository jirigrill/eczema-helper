import type { GeneratedSchedule, AllergenStatus, AllergenStatusValue, AllergenId, ProtocolAllergenId, SchedulePhase } from '$lib/domain/models';
import { addDays } from '$lib/utils/date';

function getProtocolIds(schedule: GeneratedSchedule): ProtocolAllergenId[] {
  return schedule.phases.find(p => p.type === 'elimination')?.allergenIds ?? [];
}

/**
 * Returns the lifecycle status of a single protocol allergen on `date`.
 *
 * Rules (ADR-0012):
 * - Latest-reintroduction-wins: find the most recent reintroduction phase
 *   for this allergen that has started on or before `date`.
 * - Reintroduction supersedes earlier tolerance-building: if both exist and
 *   the reintroduction started later than the tolerance-building phase, the
 *   reintroduction drives the status (not tolerance-building).
 * - A reintroduction is "reacted" if the immediately following phase is a
 *   rest phase; otherwise it is "passed" once it has ended.
 * - During reset and elimination phases: 'eliminated'.
 * - Before any reintroduction has started: 'not-yet-tested'.
 */
function getProtocolAllergenStatus(
  schedule: GeneratedSchedule,
  id: AllergenId,
  date: string
): AllergenStatusValue {
  // All reintroduction phases that include this allergen, in chronological order
  const reintroPhases = schedule.phases.filter(
    p => p.type === 'reintroduction' && (p.allergenIds as AllergenId[]).includes(id)
  );

  // Tolerance-building phase for this allergen (open-ended, at most one active)
  const tbPhase = schedule.phases.find(
    p => p.type === 'tolerance-building' && (p.allergenIds as AllergenId[]).includes(id)
  );

  // Latest reintroduction that has already started (startDate <= date)
  const startedReintros = reintroPhases.filter(p => p.startDate <= date);
  const latestReintro = startedReintros.at(-1) ?? null;

  // No reintroduction has started yet
  if (!latestReintro) {
    const activeEarlyPhase = schedule.phases.find(
      p => (p.type === 'elimination' || p.type === 'reset') &&
           p.startDate <= date && (p.endDate === '' || p.endDate >= date)
    );
    return activeEarlyPhase ? 'eliminated' : 'not-yet-tested';
  }

  // Inside the reintroduction window
  if (latestReintro.endDate === '' || latestReintro.endDate >= date) {
    return 'testing';
  }

  // Reintroduction has ended — check what follows it
  const idx = schedule.phases.indexOf(latestReintro);
  const nextPhase = schedule.phases[idx + 1] ?? null;
  const reacted = nextPhase?.type === 'rest';

  // Tolerance-building supersedes only if it started AFTER latestReintro
  // (reintroduction supersedes earlier tolerance-building — ADR-0012)
  if (tbPhase && tbPhase.startDate > latestReintro.startDate && tbPhase.startDate <= date) {
    return 'tolerance-building';
  }

  return reacted ? 'reacted' : 'passed';
}

/**
 * Returns one AllergenStatus per allergen in the closed universe:
 *   permanentMother ∪ permanentBaby ∪ protocolMembers
 *
 * The three sets are disjoint by construction. Status is derived for `date`
 * following the latest-reintroduction-wins rule documented in ADR-0012.
 */
export function getAllergenStatuses(
  schedule: GeneratedSchedule,
  date: string
): AllergenStatus[] {
  const results: AllergenStatus[] = [];

  for (const allergenId of schedule.permanentMother) {
    results.push({ allergenId, status: 'permanent-mother' });
  }
  for (const allergenId of schedule.permanentBaby) {
    // If a retest phase exists and has started, derive status via protocol logic.
    // A failed retest (→ 'reacted') reverts to 'permanent-baby' per ADR-0012.
    const hasStartedRetest = schedule.phases.some(
      p => p.type === 'reintroduction' && (p.allergenIds as AllergenId[]).includes(allergenId) && p.startDate <= date
    );
    if (hasStartedRetest) {
      const derived = getProtocolAllergenStatus(schedule, allergenId, date);
      results.push({ allergenId, status: derived === 'reacted' ? 'permanent-baby' : derived });
    } else {
      results.push({ allergenId, status: 'permanent-baby' });
    }
  }
  for (const allergenId of getProtocolIds(schedule)) {
    results.push({ allergenId, status: getProtocolAllergenStatus(schedule, allergenId, date) });
  }

  return results;
}

function verdictStatusOrder(status: AllergenStatusValue): number {
  const order: Partial<Record<AllergenStatusValue, number>> = {
    testing: 0, passed: 1, 'tolerance-building': 2,
    reacted: 3, eliminated: 4, 'not-yet-tested': 4,
  };
  return order[status] ?? 5;
}

/**
 * Filters out permanent-mother / permanent-baby entries and sorts by status
 * priority order. Used by both the today-hero projection and getPhaseVerdictStatuses.
 */
export function filterProtocolStatuses(statuses: AllergenStatus[]): AllergenStatus[] {
  return statuses
    .filter(s => s.status !== 'permanent-mother' && s.status !== 'permanent-baby')
    .sort((a, b) => verdictStatusOrder(a.status) - verdictStatusOrder(b.status));
}

/**
 * Returns the allergen verdict list for a completed reintroduction phase.
 *
 * Owns the "verdict resolves the morning after" invariant: queries
 * getAllergenStatuses at endDate + 1. Excludes permanent-mother and
 * permanent-baby entries. Results are sorted by status priority order.
 */
export function getPhaseVerdictStatuses(
  schedule: GeneratedSchedule,
  phase: SchedulePhase
): AllergenStatus[] {
  return filterProtocolStatuses(getAllergenStatuses(schedule, addDays(phase.endDate, 1)));
}
