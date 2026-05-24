import type { GeneratedSchedule, AllergenStatus, AllergenStatusValue } from '$lib/domain/models';

function getProtocolIds(schedule: GeneratedSchedule): string[] {
  return schedule.phases.find(p => p.type === 'elimination')?.categoryIds ?? [];
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
  id: string,
  date: string
): AllergenStatusValue {
  // All reintroduction phases that include this allergen, in chronological order
  const reintroPhases = schedule.phases.filter(
    p => p.type === 'reintroduction' && p.categoryIds.includes(id)
  );

  // Tolerance-building phase for this allergen (open-ended, at most one active)
  const tbPhase = schedule.phases.find(
    p => p.type === 'tolerance-building' && p.categoryIds.includes(id)
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

  for (const id of schedule.permanentMother) {
    results.push({ id, status: 'permanent-mother' });
  }
  for (const id of schedule.permanentBaby) {
    // If a retest phase exists and has started, derive status via protocol logic.
    // A failed retest (→ 'reacted') reverts to 'permanent-baby' per ADR-0012.
    const hasStartedRetest = schedule.phases.some(
      p => p.type === 'reintroduction' && p.categoryIds.includes(id) && p.startDate <= date
    );
    if (hasStartedRetest) {
      const derived = getProtocolAllergenStatus(schedule, id, date);
      results.push({ id, status: derived === 'reacted' ? 'permanent-baby' : derived });
    } else {
      results.push({ id, status: 'permanent-baby' });
    }
  }
  for (const id of getProtocolIds(schedule)) {
    results.push({ id, status: getProtocolAllergenStatus(schedule, id, date) });
  }

  return results;
}
