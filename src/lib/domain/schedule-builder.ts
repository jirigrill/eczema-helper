import type { QuestionnaireAnswers, GeneratedSchedule, SchedulePhase, EczemaSeverity, Meal, ToleranceBuildingReminder } from '$lib/domain/models';
import type { Result } from '$lib/types/result';
import { getCategoryById } from '$lib/data/categories';
import { addDays } from '$lib/utils/date';
import { getAllergenStatuses } from '$lib/domain/allergen-status';

// ── Re-test eligibility rejection ────────────────────────────

export type RetestRejection =
  | { code: 'not-baby-confirmed'; invalidIds: string[] }
  | { code: 'already-cleared';    invalidIds: string[] }
  | { code: 'retest-already-scheduled'; invalidIds: string[] };

// ── Schedule generation ───────────────────────────────────────

function phaseDurations(severity: EczemaSeverity) {
  return {
    reset: 5,
    elimination: severity === 'severe' ? 21 : 14,
    reintroduction: 4,
  };
}

/**
 * Builds a fresh schedule from questionnaire answers.
 *
 * Phase sequence: reset → elimination → sequential reintroductions (one
 * 4-day phase per tested allergen, in declaration order). Training and rest
 * phases are not included — they are added later via `addTrainingPhase` and
 * `insertRestDays`.
 *
 * Allergens listed in `permanentEliminations` (derived from
 * `motherAllergies + babyConfirmedAllergies`) are excluded from the
 * reintroduction queue entirely: they stay eliminated for the whole program
 * and there is no phase that tests them.
 *
 * `programStartDate` defaults to today if absent from answers.
 */
export function generateSchedule(answers: QuestionnaireAnswers): GeneratedSchedule {
  const durations = phaseDurations(answers.eczemaSeverity);

  const normalize = (ids: string[]) =>
    ids.map(s => s.includes(':') && !s.startsWith('other:') ? s.split(':')[0] : s);

  const permanentMother = [...new Set(normalize(answers.motherAllergies))];
  const permanentBaby = [...new Set(normalize(answers.babyConfirmedAllergies))];

  const startDate = answers.programStartDate ?? new Date().toISOString().split('T')[0];

  const phases: SchedulePhase[] = [];
  let cursor = startDate;

  // Phase 0: Reset
  const resetEnd = addDays(cursor, durations.reset - 1);
  phases.push({
    id: 'reset',
    type: 'reset',
    startDate: cursor,
    endDate: resetEnd,
    categoryIds: [],
  });
  cursor = addDays(resetEnd, 1);

  const protocolIds = answers.testedAllergens;

  // Phase A: Full elimination
  const elimEnd = addDays(cursor, durations.elimination - 1);
  phases.push({
    id: 'elimination',
    type: 'elimination',
    startDate: cursor,
    endDate: elimEnd,
    categoryIds: protocolIds,
  });
  cursor = addDays(elimEnd, 1);

  // Phase B: Sequential reintroduction (4 days each — 3 escalating eating days + evaluation day)
  const permanentEliminations = [...new Set([...permanentMother, ...permanentBaby])];
  const reintroQueue = protocolIds.filter(
    id => !permanentEliminations.includes(id)
  );
  for (const categoryId of reintroQueue) {
    const reintroEnd = addDays(cursor, durations.reintroduction - 1);
    phases.push({
      id: `reintro-${categoryId}`,
      type: 'reintroduction',
      startDate: cursor,
      endDate: reintroEnd,
      categoryIds: [categoryId],
    });
    cursor = addDays(reintroEnd, 1);
  }

  const lastPhase = phases[phases.length - 1];

  return {
    phases,
    permanentMother,
    permanentBaby,
    startDate,
    estimatedEndDate: lastPhase.endDate,
  };
}

// ── Schedule mutation: insert rest days ──────────────────────

/**
 * Inserts a rest phase immediately after `afterPhaseId` and shifts all
 * subsequent non-training phases forward by `days`.
 *
 * Training phases are excluded from the shift because they are open-ended
 * and run concurrently with the rest of the program — shifting them would
 * make their start date lag behind the phase they are attached to.
 */
export function insertRestDays(
  schedule: GeneratedSchedule,
  afterPhaseId: string,
  days: number
): GeneratedSchedule {
  const phases = schedule.phases.map(p => ({ ...p }));
  const idx = phases.findIndex(p => p.id === afterPhaseId);
  if (idx < 0) return schedule;

  const afterPhase = phases[idx];
  const restStart = addDays(afterPhase.endDate, 1);
  const restEnd = addDays(restStart, days - 1);

  const restPhase: SchedulePhase = {
    id: `rest-after-${afterPhaseId}`,
    type: 'rest',
    startDate: restStart,
    endDate: restEnd,
    categoryIds: [],
  };

  // Shift all non-tolerance-building phases after idx forward by `days`
  for (let i = idx + 1; i < phases.length; i++) {
    if (phases[i].type !== 'tolerance-building') {
      phases[i] = {
        ...phases[i],
        startDate: addDays(phases[i].startDate, days),
        endDate: addDays(phases[i].endDate, days),
      };
    }
  }

  phases.splice(idx + 1, 0, restPhase);

  const lastNonTraining = [...phases].reverse().find(p => p.type !== 'tolerance-building');
  const estimatedEndDate = lastNonTraining?.endDate ?? schedule.estimatedEndDate;

  return { ...schedule, phases, estimatedEndDate };
}

// ── Schedule mutation: add training phase ────────────────────
// Training is open-ended (no fixed duration per the guide — continues until
// the child tolerates the allergen, typically ~3 months). We don't set an
// endDate cap; the phase remains active until the user explicitly resolves it.

export function addTrainingPhase(
  schedule: GeneratedSchedule,
  allergenId: string,
  afterPhaseId: string
): GeneratedSchedule {
  const afterPhase = schedule.phases.find(p => p.id === afterPhaseId);
  if (!afterPhase) return schedule;

  // Find the rest phase that follows (if any) — training starts after rest
  const afterIdx = schedule.phases.indexOf(afterPhase);
  const nextPhase = schedule.phases[afterIdx + 1];
  const trainingStart = nextPhase?.type === 'rest'
    ? addDays(nextPhase.endDate, 1)
    : addDays(afterPhase.endDate, 1);

  const trainingPhase: SchedulePhase = {
    id: `tolerance-building-${allergenId}`,
    type: 'tolerance-building',
    startDate: trainingStart,
    endDate: '', // open-ended — no fixed end date
    categoryIds: [allergenId],
  };

  const phases = [...schedule.phases, trainingPhase];
  return { ...schedule, phases };
}

// ── Append re-test phases for confirmed baby allergies ────────

/**
 * Appends reintroduction phases for baby-confirmed allergens that are
 * eligible for a re-test.
 *
 * Acceptance rule (ADR-0012): an id is accepted iff
 *   (a) it is in `schedule.permanentBaby`,
 *   (b) its current `AllergenStatus` as of `today` is exactly `permanent-baby`, and
 *   (c) no active or future `reintroduction` phase for that id already exists.
 *
 * Rejection variants (checked in priority order):
 *   1. `not-baby-confirmed`      — id not in permanentBaby
 *   2. `retest-already-scheduled` — an active or future reintroduction phase exists
 *   3. `already-cleared`          — status is not `permanent-baby` (e.g. `passed`)
 */
export function appendReTestPhases(
  schedule: GeneratedSchedule,
  ids: string[],
  today: string,
): Result<GeneratedSchedule, RetestRejection> {
  // 1. not-baby-confirmed
  const notBaby = ids.filter(id => !schedule.permanentBaby.includes(id));
  if (notBaby.length > 0) {
    return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: notBaby } };
  }

  // 2. retest-already-scheduled (active or future reintroduction phase)
  const alreadyScheduled = ids.filter(id =>
    schedule.phases.some(
      p => p.type === 'reintroduction' &&
           p.categoryIds.includes(id) &&
           (p.endDate === '' || p.endDate >= today)
    )
  );
  if (alreadyScheduled.length > 0) {
    return { ok: false, error: { code: 'retest-already-scheduled', invalidIds: alreadyScheduled } };
  }

  // 3. already-cleared (status is not permanent-baby — e.g. passed a previous retest)
  const statuses = getAllergenStatuses(schedule, today);
  const notEligible = ids.filter(id =>
    statuses.find(s => s.id === id)?.status !== 'permanent-baby'
  );
  if (notEligible.length > 0) {
    return { ok: false, error: { code: 'already-cleared', invalidIds: notEligible } };
  }

  // All ids valid — append phases
  const reintroductionDays = 4;
  const newPhases = [...schedule.phases];
  let cursor = addDays(schedule.estimatedEndDate, 1);

  for (const categoryId of ids) {
    const end = addDays(cursor, reintroductionDays - 1);
    newPhases.push({
      id: `retest-${categoryId}-${cursor}`,
      type: 'reintroduction',
      startDate: cursor,
      endDate: end,
      categoryIds: [categoryId],
    });
    cursor = addDays(end, 1);
  }

  const newEndDate = addDays(cursor, -1);
  return { ok: true, data: { ...schedule, phases: newPhases, estimatedEndDate: newEndDate } };
}

// ── Cancel re-test phase ──────────────────────────────────────

export type RemoveRetestRejection =
  | { code: 'not-scheduled';  categoryId: string }
  | { code: 'protocol-phase'; categoryId: string };

/**
 * Removes a previously appended retest phase for `categoryId`.
 *
 * Only phases whose `id` starts with `retest-` (appended via `appendReTestPhases`)
 * are removable. Protocol reintroduction phases are not removable via this operation.
 *
 * `estimatedEndDate` is left unchanged ("drop and leave") — the caller can
 * re-schedule via `appendReTestPhases` after removal.
 */
export function removeReTestPhase(
  schedule: GeneratedSchedule,
  categoryId: string,
  today: string,
): Result<GeneratedSchedule, RemoveRetestRejection> {
  const retestPhase = schedule.phases.find(
    p =>
      p.id.startsWith('retest-') &&
      p.type === 'reintroduction' &&
      p.categoryIds.includes(categoryId) &&
      (p.endDate === '' || p.endDate >= today),
  );

  if (!retestPhase) {
    // Check if a protocol phase is blocking
    const protocolPhase = schedule.phases.find(
      p =>
        !p.id.startsWith('retest-') &&
        p.type === 'reintroduction' &&
        p.categoryIds.includes(categoryId) &&
        (p.endDate === '' || p.endDate >= today),
    );
    if (protocolPhase) {
      return { ok: false, error: { code: 'protocol-phase', categoryId } };
    }
    return { ok: false, error: { code: 'not-scheduled', categoryId } };
  }

  const phases = schedule.phases.filter(p => p.id !== retestPhase.id);
  return { ok: true, data: { ...schedule, phases } };
}

// ── Training reminders for a given date ──────────────────────

/**
 * Returns training reminders for allergens whose last logged dose was ≥ 3
 * days ago (or never). The threshold mirrors the protocol guideline: training
 * doses should appear at most every 3 days to avoid desensitisation.
 *
 * "Last dose date" is the most recent `meal.date` among meals that contain
 * an item whose `categoryId` matches the training allergen. When no such
 * meal exists `daysSince` is set to 999, ensuring the reminder always fires
 * on the first day of training.
 */
export function getToleranceBuildingRemindersForDate(
  schedule: GeneratedSchedule,
  date: string,
  meals: Meal[]
): ToleranceBuildingReminder[] {
  const trainingPhases = schedule.phases.filter(
    p => p.type === 'tolerance-building' && date >= p.startDate && (p.endDate === '' || date <= p.endDate)
  );

  return trainingPhases.map(phase => {
    const categoryId = phase.categoryIds[0];
    const cat = getCategoryById(categoryId);

    const relevantMeals = meals
      .filter(m => m.date <= date && m.items.some(i => i.categoryId === categoryId))
      .sort((a, b) => b.date.localeCompare(a.date));

    const lastDate = relevantMeals[0]?.date;
    const daysSince = lastDate
      ? Math.round((new Date(date + 'T00:00:00').getTime() - new Date(lastDate + 'T00:00:00').getTime()) / 86400000)
      : 999;

    return {
      allergenId: categoryId,
      daysSinceLastDose: daysSince,
      label: `${cat?.icon ?? ''} ${cat?.nameCs ?? categoryId}`,
    };
  }).filter(r => r.daysSinceLastDose >= 3);
}
