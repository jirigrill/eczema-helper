import type { GeneratedSchedule, SchedulePhase, MealItem, ReintroductionDayInfo, AllergenStatusValue } from '$lib/domain/models';
import { getPermanentEliminations } from '$lib/domain/models';
import { getAllergenStatuses } from '$lib/domain/allergen-status';
import { isDateInRange } from '$lib/utils/date';

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
): string[] {
  const phase = getPhaseForDate(schedule, date);

  // Step 1: reset guard
  if (!phase || phase.type === 'reset') {
    return getPermanentEliminations(schedule);
  }

  // Step 2: status filter
  return getAllergenStatuses(schedule, date)
    .filter(s => FORBIDDEN_STATUSES.has(s.status))
    .map(s => s.id);
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
  eliminatedSlugs: string[]
): MealItem[] {
  return items.filter(
    item => item.categoryId !== null && eliminatedSlugs.includes(item.categoryId)
  );
}

// ── Reintroduction day info (4-day gradual dosing) ──────────────
// 4 eating days with escalating doses. Evaluation at end of day 4.

const REINTRO_4DAY: Pick<ReintroductionDayInfo, 'label' | 'guidance' | 'isEvaluationDay'>[] = [
  { label: 'Malé množství', guidance: '1 lžička nebo malý kousek', isEvaluationDay: false },
  { label: 'Střední porce', guidance: '2–3 lžíce', isEvaluationDay: false },
  { label: 'Neomezeně', guidance: 'Jezte alergen bez omezení', isEvaluationDay: false },
  { label: 'Neomezeně', guidance: 'Jezte alergen bez omezení — večer vyhodnoťte reakci', isEvaluationDay: true },
];

export function getReintroductionDayInfo(
  schedule: GeneratedSchedule,
  date: string
): ReintroductionDayInfo | null {
  const phase = getPhaseForDate(schedule, date);
  if (!phase || phase.type !== 'reintroduction') return null;

  const allergenId = phase.categoryIds[0];
  if (!allergenId) return null;

  const phaseStart = new Date(phase.startDate + 'T00:00:00');
  const target = new Date(date + 'T00:00:00');
  const dayInPhase = Math.round((target.getTime() - phaseStart.getTime()) / 86400000) + 1;

  const totalDays = Math.round(
    (new Date(phase.endDate + 'T00:00:00').getTime() - phaseStart.getTime()) / 86400000
  ) + 1;

  const entry = REINTRO_4DAY[Math.min(dayInPhase - 1, REINTRO_4DAY.length - 1)];

  return { dayInPhase, totalDays, allergenId, ...entry };
}

// ── Progress ──────────────────────────────────────────────────
// Progress counts only non-training phases (training runs in parallel).

export function getScheduleProgress(
  schedule: GeneratedSchedule,
  today: string
): { currentDay: number; totalDays: number; percentComplete: number } {
  const start = new Date(schedule.startDate + 'T00:00:00');
  const end = new Date(schedule.estimatedEndDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');

  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const currentDay = Math.max(1, Math.min(totalDays, Math.round((now.getTime() - start.getTime()) / 86400000) + 1));
  const percentComplete = Math.round((currentDay / totalDays) * 100);

  return { currentDay, totalDays, percentComplete };
}
