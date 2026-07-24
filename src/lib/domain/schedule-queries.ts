import { getAllergenStatuses } from '$lib/domain/allergen-status';
import type { Actor, FeedingStage } from '$lib/domain/models';
import type {
  AllergenId,
  AllergenStatus,
  AllergenStatusValue,
  GeneratedSchedule,
  MealItem,
  QuestionnaireAnswers,
  ReintroductionDayInfo,
  SchedulePhase,
} from '$lib/domain/models';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import { daysBetween, isDateInRange } from '$lib/utils/date';

// ── Current phase ─────────────────────────────────────────────

function isPhaseActiveOnDate(phase: SchedulePhase, date: string): boolean {
  if (phase.endDate === '') return date >= phase.startDate;
  return isDateInRange(date, phase.startDate, phase.endDate);
}

export function getPhaseForDate(schedule: GeneratedSchedule, date: string): SchedulePhase | null {
  // Tolerance-building phases overlap with others — prefer non-tolerance-building phases first
  const nonTb = schedule.phases.find(
    (p) => p.type !== 'tolerance-building' && isPhaseActiveOnDate(p, date),
  );
  if (nonTb) return nonTb;
  return schedule.phases.find((p) => isPhaseActiveOnDate(p, date)) ?? null;
}

// ── What is eliminated on a given date ───────────────────────
// See CONTEXT.md → EliminationWindow for the two-step rule.

const PROTOCOL_FORBIDDEN_STATUSES = new Set<AllergenStatusValue>([
  'eliminated',
  'reacted',
  'not-yet-tested',
]);

/**
 * Returns the *protocol* allergen slugs eliminated on `date` — statuses
 * { eliminated, reacted, not-yet-tested } only. Permanent-mother /
 * permanent-baby eliminations are deliberately excluded: they are per-actor,
 * so callers combine them with this protocol set themselves
 * (`[...protocolEliminated, ...permanentMother]` for a mother meal,
 * `[...protocolEliminated, ...permanentBaby]` for a baby meal).
 *
 * Two-step rule (see CONTEXT.md → EliminationWindow):
 * 1. Reset guard — during `reset` or before the program starts, no protocol
 *    allergen is eliminated (the mother eats them normally to establish a
 *    baseline), so the protocol set is empty.
 * 2. Status filter — for all other phases, return ids of allergens whose
 *    `AllergenStatus` is in { eliminated, reacted, not-yet-tested }. Statuses
 *    { testing, passed, tolerance-building } are not forbidden.
 */
export function getProtocolEliminatedForDate(
  schedule: GeneratedSchedule,
  date: string,
): AllergenId[] {
  const phase = getPhaseForDate(schedule, date);

  // Step 1: reset guard
  if (!phase || phase.type === 'reset') {
    return [];
  }

  // Step 2: status filter
  return getAllergenStatuses(schedule, date)
    .filter((s) => PROTOCOL_FORBIDDEN_STATUSES.has(s.status))
    .map((s) => s.allergenId);
}

// ── End-of-phase evaluation check ────────────────────────────
// Returns true on the last day of reset, elimination, or reintroduction phases (not rest/training).

export function isPhaseEndForEvaluation(schedule: GeneratedSchedule, date: string): boolean {
  const phase = getPhaseForDate(schedule, date);
  if (!phase) return false;
  if (phase.type === 'rest' || phase.type === 'tolerance-building') return false;
  return date === phase.endDate;
}

// ── Conflict detection ────────────────────────────────────────

export function detectConflicts(
  items: MealItem[],
  eliminatedSlugs: AllergenId[],
  catalog: CanonicalCatalogPort,
): MealItem[] {
  if (eliminatedSlugs.length === 0) return [];
  return items.filter((item) => {
    const triggers = catalog.allergensForFood(item.foodId);
    return triggers.some((t) => eliminatedSlugs.includes(t as AllergenId));
  });
}

/**
 * The distinct eliminated allergen ids actually triggered by `items` — the
 * intersection of every item's triggering allergens with `eliminatedSlugs`.
 * This is the companion to `detectConflicts` (which returns the offending
 * *items*): callers that need to label *which* allergens conflict — e.g. the
 * warning pills on a meal row — use this instead of re-walking the items and
 * re-filtering by hand.
 */
export function conflictingAllergens(
  items: MealItem[],
  eliminatedSlugs: AllergenId[],
  catalog: CanonicalCatalogPort,
): AllergenId[] {
  if (eliminatedSlugs.length === 0) return [];
  const triggered = new Set<AllergenId>();
  for (const item of items) {
    for (const t of catalog.allergensForFood(item.foodId)) {
      if (eliminatedSlugs.includes(t as AllergenId)) triggered.add(t as AllergenId);
    }
  }
  return [...triggered];
}

// ── Reintroduction day info ───────────────────────────────────
// Dosing instructions are per-allergen; see the catalog records' ladder field (ADR-0023).
// isEvaluationDay derives from the current rung's isEvaluationCheckpoint flag —
// the rung whose index in the ladder corresponds to `dayInPhase`.

export function getReintroductionDayInfo(
  schedule: GeneratedSchedule,
  date: string,
  catalog: CanonicalCatalogPort,
  feedingStage: FeedingStage,
): ReintroductionDayInfo | null {
  const phase = getPhaseForDate(schedule, date);
  if (!phase || phase.type !== 'reintroduction') return null;

  const allergenId = phase.allergenIds[0];
  if (!allergenId) return null;

  const dayInPhase = daysBetween(phase.startDate, date);
  const totalDays = daysBetween(phase.startDate, phase.endDate);

  const rung = catalog.get(allergenId)?.ladder?.stages[feedingStage]?.[dayInPhase - 1];
  const isEvaluationDay = rung?.isEvaluationCheckpoint ?? dayInPhase === totalDays;

  return { dayInPhase, totalDays, allergenId, isEvaluationDay };
}

// ── Progress ──────────────────────────────────────────────────
// Progress counts only non-training phases (training runs in parallel).

export function getScheduleProgress(
  schedule: GeneratedSchedule,
  today: string,
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
  /** Protocol allergens eliminated today (statuses eliminated/reacted/not-yet-tested). */
  protocolEliminated: AllergenId[];
  /** Mother's permanent (never-reintroduced) eliminations. */
  permanentMother: AllergenId[];
  /** Baby's permanent (never-reintroduced) eliminations. */
  permanentBaby: AllergenId[];
  reintroInfo: ReintroductionDayInfo | null;
  progress: { currentDay: number; totalDays: number; percentComplete: number };
};

export function buildScheduleContext(
  raw: { schedule: GeneratedSchedule; answers: QuestionnaireAnswers },
  today: string,
  catalog: CanonicalCatalogPort,
  feedingStage: FeedingStage,
): ReadyContext {
  const { schedule, answers } = raw;
  return {
    schedule,
    answers,
    allergenStatuses: getAllergenStatuses(schedule, today),
    protocolEliminated: getProtocolEliminatedForDate(schedule, today),
    permanentMother: schedule.permanentMother,
    permanentBaby: schedule.permanentBaby,
    reintroInfo: getReintroductionDayInfo(schedule, today, catalog, feedingStage),
    progress: getScheduleProgress(schedule, today),
  };
}

/**
 * The eliminated set to check *one actor's* meal against: the protocol set
 * combined with that actor's permanent eliminations. This is the deliberate
 * per-actor recombination of `ReadyContext`'s three separate fields (spec
 * #568 keeps them unmerged to prevent the shared-field drift that MealCard
 * suffered). Centralised here so the "which permanent set for which actor"
 * rule lives in one place rather than being re-spelled at each call site.
 */
export function eliminatedFor(ctx: ReadyContext, actor: Actor): AllergenId[] {
  const permanent = actor === 'baby' ? ctx.permanentBaby : ctx.permanentMother;
  return [...ctx.protocolEliminated, ...permanent];
}
