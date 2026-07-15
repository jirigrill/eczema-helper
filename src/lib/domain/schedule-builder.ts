import { getAllergenStatuses } from '$lib/domain/allergen-status';
import type {
  AllergenId,
  AllergenOutcome,
  EczemaSeverity,
  GeneratedSchedule,
  LadderAllergenId,
  Meal,
  QuestionnaireAnswers,
  SchedulePhase,
  ToleranceBuildingReminder,
} from '$lib/domain/models';
import {
  ELIMINATION_PHASE_DAYS_DEFAULT,
  ELIMINATION_PHASE_DAYS_SEVERE,
  NEVER_DOSED_SENTINEL_DAYS,
  REINTRODUCTION_PHASE_DAYS,
  RESET_PHASE_DAYS,
  REST_PHASE_DAYS_CLEAR,
  REST_PHASE_DAYS_MILD,
  REST_PHASE_DAYS_SEVERE,
  TRAINING_REMINDER_THRESHOLD_DAYS,
} from '$lib/domain/policy';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import type { Result } from '$lib/types/result';
import { addDays } from '$lib/utils/date';

// ── Re-test eligibility rejection ────────────────────────────

export type RetestRejection =
  | { code: 'not-baby-confirmed'; invalidIds: AllergenId[] }
  | { code: 'already-cleared'; invalidIds: AllergenId[] }
  | { code: 'retest-already-scheduled'; invalidIds: AllergenId[] };

// ── Schedule generation ───────────────────────────────────────

function phaseDurations(severity: EczemaSeverity) {
  return {
    reset: RESET_PHASE_DAYS,
    elimination:
      severity === 'severe' ? ELIMINATION_PHASE_DAYS_SEVERE : ELIMINATION_PHASE_DAYS_DEFAULT,
    reintroduction: REINTRODUCTION_PHASE_DAYS,
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

  const normalize = (ids: AllergenId[]): AllergenId[] =>
    ids.map((s) =>
      s.includes(':') && !s.startsWith('other:') ? (s.split(':')[0] as AllergenId) : s,
    );

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
    allergenIds: [],
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
    allergenIds: protocolIds,
  });
  cursor = addDays(elimEnd, 1);

  // Phase B: Sequential reintroduction (4 days each — 3 escalating eating days + evaluation day)
  const permanentEliminations = new Set<AllergenId>([...permanentMother, ...permanentBaby]);
  const reintroQueue = protocolIds.filter((id) => !permanentEliminations.has(id));
  for (const allergenId of reintroQueue) {
    const reintroEnd = addDays(cursor, durations.reintroduction - 1);
    phases.push({
      id: `reintro-${allergenId}`,
      type: 'reintroduction',
      startDate: cursor,
      endDate: reintroEnd,
      allergenIds: [allergenId],
    });
    cursor = addDays(reintroEnd, 1);
  }

  const lastPhase = phases[phases.length - 1]!;

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
  days: number,
): GeneratedSchedule {
  const phases = schedule.phases.map((p) => ({ ...p }));
  const idx = phases.findIndex((p) => p.id === afterPhaseId);
  if (idx < 0) return schedule;

  const afterPhase = phases[idx]!;
  const restStart = addDays(afterPhase.endDate, 1);
  const restEnd = addDays(restStart, days - 1);

  const restPhase: SchedulePhase = {
    id: `rest-after-${afterPhaseId}`,
    type: 'rest',
    startDate: restStart,
    endDate: restEnd,
    allergenIds: [],
  };

  // Shift all non-tolerance-building phases after idx forward by `days`
  for (let i = idx + 1; i < phases.length; i++) {
    const phase = phases[i]!;
    if (phase.type !== 'tolerance-building') {
      phases[i] = {
        ...phase,
        startDate: addDays(phase.startDate, days),
        endDate: addDays(phase.endDate, days),
      };
    }
  }

  phases.splice(idx + 1, 0, restPhase);

  const lastNonTraining = [...phases].reverse().find((p) => p.type !== 'tolerance-building');
  const estimatedEndDate = lastNonTraining?.endDate ?? schedule.estimatedEndDate;

  return { ...schedule, phases, estimatedEndDate };
}

// ── Apply reintroduction verdict ─────────────────────────────

/**
 * Maps a reintroduction verdict to its schedule consequence (ADR-0016).
 *
 * `tolerated` returns the schedule unchanged. Any reaction inserts a `rest`
 * phase after `phaseId` whose length is keyed to severity:
 *   mild-reaction   → REST_PHASE_DAYS_MILD
 *   clear-reaction  → REST_PHASE_DAYS_CLEAR
 *   severe-reaction → REST_PHASE_DAYS_SEVERE
 *
 * Status (`reacted` vs `passed`) stays topology-derived — it follows
 * automatically from whether a `rest` phase now sits after the reintroduction.
 */
export function applyReintroductionVerdict(
  schedule: GeneratedSchedule,
  phaseId: string,
  outcome: AllergenOutcome,
): GeneratedSchedule {
  if (outcome === 'tolerated') return schedule;
  const days =
    outcome === 'mild-reaction'
      ? REST_PHASE_DAYS_MILD
      : outcome === 'clear-reaction'
        ? REST_PHASE_DAYS_CLEAR
        : REST_PHASE_DAYS_SEVERE;
  return insertRestDays(schedule, phaseId, days);
}

// ── Schedule mutation: add training phase ────────────────────
// Training is open-ended (no fixed duration per the guide — continues until
// the child tolerates the allergen, typically ~3 months). We don't set an
// endDate cap; the phase remains active until the user explicitly resolves it.

export function addTrainingPhase(
  schedule: GeneratedSchedule,
  allergenId: LadderAllergenId,
  afterPhaseId: string,
): GeneratedSchedule {
  const afterPhase = schedule.phases.find((p) => p.id === afterPhaseId);
  if (!afterPhase) return schedule;

  // Find the rest phase that follows (if any) — training starts after rest
  const afterIdx = schedule.phases.indexOf(afterPhase);
  const nextPhase = schedule.phases[afterIdx + 1];
  const trainingStart =
    nextPhase?.type === 'rest' ? addDays(nextPhase.endDate, 1) : addDays(afterPhase.endDate, 1);

  const trainingPhase: SchedulePhase = {
    id: `tolerance-building-${allergenId}`,
    type: 'tolerance-building',
    startDate: trainingStart,
    endDate: '', // open-ended — no fixed end date
    allergenIds: [allergenId],
  };

  const phases = [...schedule.phases, trainingPhase];
  return { ...schedule, phases };
}

// ── Append re-test phases for confirmed baby allergies ────────

/**
 * Appends reintroduction phases for allergens that are eligible for a re-test.
 *
 * Acceptance rule (ADR-0012, widened): an id is accepted iff
 *   (a) its current `AllergenStatus` as of `today` is exactly `permanent-baby`
 *       OR `reacted` (a reacted protocol allergen is retestable), and
 *   (b) no active or future `reintroduction` phase for that id already exists.
 *
 * Rejection variants (checked in priority order):
 *   1. `not-baby-confirmed`        — id is a `permanent-mother` allergy (never retestable)
 *   2. `retest-already-scheduled`  — an active or future reintroduction phase exists
 *   3. `already-cleared`           — latest verdict is `passed` (no need to retest)
 *
 * Note: the `not-baby-confirmed` code name is preserved for caller stability;
 * its semantic now narrows to "permanent-mother" only.
 */
export function appendReTestPhases(
  schedule: GeneratedSchedule,
  ids: LadderAllergenId[],
  today: string,
): Result<GeneratedSchedule, RetestRejection> {
  const statuses = getAllergenStatuses(schedule, today);
  const statusOf = (id: AllergenId) => statuses.find((s) => s.allergenId === id)?.status;

  // 1. not-baby-confirmed (mother allergy — never retestable)
  const motherIds = ids.filter((id) => statusOf(id) === 'permanent-mother');
  if (motherIds.length > 0) {
    return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: motherIds } };
  }

  // 2. retest-already-scheduled (active or future reintroduction phase)
  const alreadyScheduled = ids.filter((id) =>
    schedule.phases.some(
      (p) =>
        p.type === 'reintroduction' &&
        p.allergenIds.includes(id) &&
        (p.endDate === '' || p.endDate >= today),
    ),
  );
  if (alreadyScheduled.length > 0) {
    return { ok: false, error: { code: 'retest-already-scheduled', invalidIds: alreadyScheduled } };
  }

  // 3. already-cleared (latest verdict was clean)
  const notEligible = ids.filter((id) => {
    const status = statusOf(id);
    return status !== 'permanent-baby' && status !== 'reacted';
  });
  if (notEligible.length > 0) {
    return { ok: false, error: { code: 'already-cleared', invalidIds: notEligible } };
  }

  // All ids valid — append phases
  const newPhases = [...schedule.phases];
  let cursor = addDays(schedule.estimatedEndDate, 1);

  for (const allergenId of ids) {
    const end = addDays(cursor, REINTRODUCTION_PHASE_DAYS - 1);
    newPhases.push({
      id: `retest-${allergenId}-${cursor}`,
      type: 'reintroduction',
      startDate: cursor,
      endDate: end,
      allergenIds: [allergenId],
    });
    cursor = addDays(end, 1);
  }

  const newEndDate = addDays(cursor, -1);
  return { ok: true, data: { ...schedule, phases: newPhases, estimatedEndDate: newEndDate } };
}

// ── Cancel re-test phase ──────────────────────────────────────

export type RemoveRetestRejection =
  | { code: 'not-scheduled'; allergenId: LadderAllergenId }
  | { code: 'protocol-phase'; allergenId: LadderAllergenId };

/**
 * Removes a previously appended retest phase for `allergenId`.
 *
 * Only phases whose `id` starts with `retest-` (appended via `appendReTestPhases`)
 * are removable. Protocol reintroduction phases are not removable via this operation.
 *
 * `estimatedEndDate` is left unchanged ("drop and leave") — the caller can
 * re-schedule via `appendReTestPhases` after removal.
 */
export function removeReTestPhase(
  schedule: GeneratedSchedule,
  allergenId: LadderAllergenId,
  today: string,
): Result<GeneratedSchedule, RemoveRetestRejection> {
  const retestPhase = schedule.phases.find(
    (p) =>
      p.id.startsWith('retest-') &&
      p.type === 'reintroduction' &&
      p.allergenIds.includes(allergenId) &&
      (p.endDate === '' || p.endDate >= today),
  );

  if (!retestPhase) {
    // Check if a protocol phase is blocking
    const protocolPhase = schedule.phases.find(
      (p) =>
        !p.id.startsWith('retest-') &&
        p.type === 'reintroduction' &&
        p.allergenIds.includes(allergenId) &&
        (p.endDate === '' || p.endDate >= today),
    );
    if (protocolPhase) {
      return { ok: false, error: { code: 'protocol-phase', allergenId } };
    }
    return { ok: false, error: { code: 'not-scheduled', allergenId } };
  }

  const phases = schedule.phases.filter((p) => p.id !== retestPhase.id);
  return { ok: true, data: { ...schedule, phases } };
}

// ── Training reminders for a given date ──────────────────────

/**
 * Returns training reminders for allergens whose last logged dose was ≥ 3
 * days ago (or never). The threshold mirrors the protocol guideline: training
 * doses should appear at most every 3 days to avoid desensitisation.
 *
 * "Last dose date" is the most recent `meal.date` among meals that contain
 * an item whose `allergenId` matches the training allergen. When no such
 * meal exists `daysSince` is set to 999, ensuring the reminder always fires
 * on the first day of training.
 */
export function getToleranceBuildingRemindersForDate(
  schedule: GeneratedSchedule,
  date: string,
  meals: Meal[],
  catalog: CanonicalCatalogPort,
): ToleranceBuildingReminder[] {
  const trainingPhases = schedule.phases.filter(
    (p) =>
      p.type === 'tolerance-building' &&
      date >= p.startDate &&
      (p.endDate === '' || date <= p.endDate),
  );

  return trainingPhases
    .map((phase) => {
      // A tolerance-building phase always carries exactly the one allergen it trains.
      const allergenId = phase.allergenIds[0]!;

      const relevantMeals = meals
        .filter(
          (m) =>
            m.date <= date &&
            m.items.some((i) => catalog.allergensForFood(i.foodId).includes(allergenId)),
        )
        .sort((a, b) => b.date.localeCompare(a.date));

      const lastDate = relevantMeals[0]?.date;
      const daysSince = lastDate
        ? Math.round(
            (new Date(date + 'T00:00:00').getTime() - new Date(lastDate + 'T00:00:00').getTime()) /
              86400000,
          )
        : NEVER_DOSED_SENTINEL_DAYS;

      return {
        allergenId,
        daysSinceLastDose: daysSince,
      };
    })
    .filter((r) => r.daysSinceLastDose >= TRAINING_REMINDER_THRESHOLD_DAYS);
}
