import type { GeneratedSchedule, QuestionnaireAnswers, SchedulePhase, MealItem, ReintroductionDayInfo, AllergenStatusValue, AllergenStatus, AllergenId } from '$lib/domain/models';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import { getPermanentEliminations } from '$lib/domain/models';
import { getAllergenStatuses } from '$lib/domain/allergen-status';
import { V1_FEEDING_STAGE } from '$lib/domain/canonical-allergen';
import { isDateInRange, daysBetween } from '$lib/utils/date';

// ── Current phase ─────────────────────────────────────────────

function isPhaseActiveOnDate(phase: SchedulePhase, date: string): boolean {
  if (phase.endDate === '') return date >= phase.startDate;
  return isDateInRange(date, phase.startDate, phase.endDate);
}

export function getPhaseForDate(schedule: GeneratedSchedule, date: string): SchedulePhase | null {
  // Tolerance-building phases overlap with others — prefer non-tolerance-building phases first
  const nonTb = schedule.phases.find(p => p.type !== 'tolerance-building' && isPhaseActiveOnDate(p, date));
  if (nonTb) return nonTb;
  return schedule.phases.find(p => isPhaseActiveOnDate(p, date)) ?? null;
}

// ── What is eliminated on a given date ───────────────────────
// See CONTEXT.md → EliminationWindow for the two-step rule.

const FORBIDDEN_STATUSES = new Set<AllergenStatusValue>([
  'permanent-mother',
  'permanent-baby',
  'eliminated',
  'reacted',
  'not-yet-tested',
]);

/**
 * Returns the allergen slugs the mother must not eat on `date`.
 *
 * Two-step rule (see CONTEXT.md → EliminationWindow):
 * 1. Reset guard — during `reset` or before the program starts, return only
 *    permanent eliminations. Protocol allergens carry status `eliminated`
 *    during reset, but the mother eats them normally to establish a baseline.
 * 2. Status filter — for all other phases, return ids of allergens whose
 *    `AllergenStatus` is in { permanent-mother, permanent-baby, eliminated,
 *    reacted, not-yet-tested }. Statuses { testing, passed,
 *    tolerance-building } are not forbidden.
 */
export function getEliminatedSlugsForDate(
  schedule: GeneratedSchedule,
  date: string
): AllergenId[] {
  const phase = getPhaseForDate(schedule, date);

  // Step 1: reset guard
  if (!phase || phase.type === 'reset') {
    return getPermanentEliminations(schedule);
  }

  // Step 2: status filter
  return getAllergenStatuses(schedule, date)
    .filter(s => FORBIDDEN_STATUSES.has(s.status))
    .map(s => s.allergenId);
}

// ── End-of-phase evaluation check ────────────────────────────
// Returns true on the last day of reset, elimination, or reintroduction phases (not rest/training).

export function isPhaseEndForEvaluation(
  schedule: GeneratedSchedule,
  date: string
): boolean {
  const phase = getPhaseForDate(schedule, date);
  if (!phase) return false;
  if (phase.type === 'rest' || phase.type === 'tolerance-building') return false;
  return date === phase.endDate;
}

// ── Conflict detection ────────────────────────────────────────

export function detectConflicts(
  items: MealItem[],
  eliminatedSlugs: AllergenId[],
  catalog: CanonicalCatalogPort
): MealItem[] {
  if (eliminatedSlugs.length === 0) return [];
  return items.filter(item => {
    const triggers = catalog.allergensForFood(item.foodId);
    return triggers.some(t => eliminatedSlugs.includes(t as AllergenId));
  });
}

// ── Reintroduction day info ───────────────────────────────────
// Dosing instructions are per-allergen; see the catalog records' ladder field (ADR-0023).
// isEvaluationDay derives from the current rung's isEvaluationCheckpoint flag —
// the rung whose index in the ladder corresponds to `dayInPhase`.

export function getReintroductionDayInfo(
  schedule: GeneratedSchedule,
  date: string,
  catalog: CanonicalCatalogPort
): ReintroductionDayInfo | null {
  const phase = getPhaseForDate(schedule, date);
  if (!phase || phase.type !== 'reintroduction') return null;

  const allergenId = phase.allergenIds[0];
  if (!allergenId) return null;

  const dayInPhase = daysBetween(phase.startDate, date);
  const totalDays = daysBetween(phase.startDate, phase.endDate);

  const rung = catalog.get(allergenId)?.ladder?.stages[V1_FEEDING_STAGE]?.[dayInPhase - 1];
  const isEvaluationDay = rung?.isEvaluationCheckpoint ?? (dayInPhase === totalDays);

  return { dayInPhase, totalDays, allergenId, isEvaluationDay };
}

// ── Progress ──────────────────────────────────────────────────
// Progress counts only non-training phases (training runs in parallel).

export function getScheduleProgress(
  schedule: GeneratedSchedule,
  today: string
): { currentDay: number; totalDays: number; percentComplete: number } {
  const totalDays = daysBetween(schedule.startDate, schedule.estimatedEndDate);
  const currentDay = Math.max(1, Math.min(totalDays, daysBetween(schedule.startDate, today)));
  const percentComplete = Math.round((currentDay / totalDays) * 100);

  return { currentDay, totalDays, percentComplete };
}

// ── ReadyContext + buildScheduleContext ───────────────────────
// Pure projection: (schedule, answers, today) → snapshot of "where is the mother today".
// Consumed by the scheduleContext store shell, which owns DB plumbing and lifecycle states.

export type ReadyContext = {
  schedule: GeneratedSchedule;
  answers: QuestionnaireAnswers;
  allergenStatuses: AllergenStatus[];
  eliminatedToday: AllergenId[];
  reintroInfo: ReintroductionDayInfo | null;
  progress: { currentDay: number; totalDays: number; percentComplete: number };
};

export function buildScheduleContext(
  raw: { schedule: GeneratedSchedule; answers: QuestionnaireAnswers },
  today: string,
  catalog: CanonicalCatalogPort
): ReadyContext {
  const { schedule, answers } = raw;
  return {
    schedule,
    answers,
    allergenStatuses: getAllergenStatuses(schedule, today),
    eliminatedToday: getEliminatedSlugsForDate(schedule, today),
    reintroInfo: getReintroductionDayInfo(schedule, today, catalog),
    progress: getScheduleProgress(schedule, today),
  };
}
