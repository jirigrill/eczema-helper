import type { GeneratedSchedule, SchedulePhase, MealItem, ReintroductionDayInfo } from '$lib/domain/models';
import { isDateInRange } from '$lib/utils/date';

// ── Current phase ─────────────────────────────────────────────

function isPhaseActiveOnDate(phase: SchedulePhase, date: string): boolean {
  if (phase.endDate === '') return date >= phase.startDate;
  return isDateInRange(date, phase.startDate, phase.endDate);
}

export function getPhaseForDate(schedule: GeneratedSchedule, date: string): SchedulePhase | null {
  // Training phases overlap with others — prefer non-training phases first
  const nonTraining = schedule.phases.find(p => p.type !== 'training' && isPhaseActiveOnDate(p, date));
  if (nonTraining) return nonTraining;
  return schedule.phases.find(p => isPhaseActiveOnDate(p, date)) ?? null;
}

// ── What is eliminated on a given date ───────────────────────
// See CONTEXT.md → EliminationWindow for the per-phase semantics table.

// Derive the protocol from the schedule's elimination phase so it stays data-driven.
function getProtocolIds(schedule: GeneratedSchedule): string[] {
  const elimPhase = schedule.phases.find(p => p.type === 'elimination');
  return elimPhase?.categoryIds ?? [];
}

function getPassedAllergens(schedule: GeneratedSchedule, beforeIndex: number): Set<string> {
  const passed = new Set<string>();
  for (let i = 0; i < beforeIndex; i++) {
    const p = schedule.phases[i];
    if (p.type === 'reintroduction') {
      // An allergen passed if its reintroduction is NOT followed by a rest phase
      const nextPhase = schedule.phases[i + 1];
      if (!nextPhase || nextPhase.type !== 'rest') {
        for (const id of p.categoryIds) passed.add(id);
      }
    }
  }
  return passed;
}

/**
 * Returns the allergen slugs the mother must not eat on `date`.
 *
 * The result depends on the active phase type — see the EliminationWindow
 * entry in CONTEXT.md for the full per-phase semantics table. In brief:
 * - `reset`: only `permanentEliminations`
 * - `elimination`: permanent + all protocol allergens
 * - `reintroduction` of X: permanent + protocol minus X minus already-passed
 * - `rest`: permanent + protocol minus already-passed (no current exception)
 * - `training` of X: same as the concurrent non-training phase, but X is also allowed
 * - after all phases: only `permanentEliminations`
 *
 * An allergen counts as "passed" only if its reintroduction phase is not
 * immediately followed by a rest phase (a rest phase signals a reaction).
 */
export function getEliminatedSlugsForDate(
  schedule: GeneratedSchedule,
  date: string
): string[] {
  const eliminated = new Set<string>(schedule.permanentEliminations);
  const phase = getPhaseForDate(schedule, date);

  if (!phase) return [...eliminated];

  if (phase.type === 'reset') {
    return [...eliminated];
  }

  if (phase.type === 'elimination') {
    for (const categoryId of phase.categoryIds) {
      if (!schedule.permanentEliminations.includes(categoryId)) {
        eliminated.add(categoryId);
      }
    }
    return [...eliminated];
  }

  if (phase.type === 'reintroduction' || phase.type === 'rest') {
    const protocolIds = getProtocolIds(schedule);
    const thisIndex = schedule.phases.indexOf(phase);
    const alreadyPassed = getPassedAllergens(schedule, thisIndex);

    for (const categoryId of protocolIds) {
      if (
        !schedule.permanentEliminations.includes(categoryId) &&
        !alreadyPassed.has(categoryId) &&
        !(phase.type === 'reintroduction' && phase.categoryIds.includes(categoryId))
      ) {
        eliminated.add(categoryId);
      }
    }
    return [...eliminated];
  }

  if (phase.type === 'training') {
    // Training phases are concurrent — find the "real" phase context from surrounding phases
    const trainingId = phase.categoryIds[0];
    // Find non-training phase for this date (reintroduction or rest)
    const realPhase = schedule.phases.find(
      p => p.type !== 'training' && isDateInRange(date, p.startDate, p.endDate)
    );
    if (realPhase) {
      const baseEliminated = new Set(getEliminatedSlugsForDate(
        { ...schedule, phases: schedule.phases.filter(p => p.type !== 'training') },
        date
      ));
      // Training allergen is allowed in small doses
      baseEliminated.delete(trainingId);
      return [...baseEliminated];
    }
    // If no concurrent phase, only permanent eliminations + training allergen allowed
    return [...eliminated];
  }

  return [...eliminated];
}

// ── End-of-phase evaluation check ────────────────────────────
// Returns true on the last day of reset, elimination, or reintroduction phases (not rest/training).

export function isPhaseEndForEvaluation(
  schedule: GeneratedSchedule,
  date: string
): boolean {
  const phase = getPhaseForDate(schedule, date);
  if (!phase) return false;
  if (phase.type === 'rest' || phase.type === 'training') return false;
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
