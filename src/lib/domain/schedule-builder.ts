import type { QuestionnaireAnswers, GeneratedSchedule, SchedulePhase, EczemaSeverity, Meal, ToleranceBuildingReminder } from '$lib/domain/models';
import { getCategoryById } from '$lib/data/categories';
import { addDays } from '$lib/utils/date';

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
    label: 'Resetovací fáze',
    startDate: cursor,
    endDate: resetEnd,
    categoryIds: [],
    description: 'Jezte normálně (kromě potvrzených alergií). Zaznamenáváme výchozí stav kůže miminka před zahájením eliminace.',
  });
  cursor = addDays(resetEnd, 1);

  const protocolIds = answers.testedAllergens;

  // Phase A: Full elimination
  const elimEnd = addDays(cursor, durations.elimination - 1);
  phases.push({
    id: 'elimination',
    type: 'elimination',
    label: 'Eliminační fáze',
    startDate: cursor,
    endDate: elimEnd,
    categoryIds: protocolIds,
    description: 'Vylučte všechny sledované alergeny. Čekáme, až se stav kůže miminka ustálí.',
  });
  cursor = addDays(elimEnd, 1);

  // Phase B: Sequential reintroduction (4 days each — 3 escalating eating days + evaluation day)
  const permanentEliminations = [...new Set([...permanentMother, ...permanentBaby])];
  const reintroQueue = protocolIds.filter(
    id => !permanentEliminations.includes(id)
  );
  for (const categoryId of reintroQueue) {
    const cat = getCategoryById(categoryId);
    const reintroEnd = addDays(cursor, durations.reintroduction - 1);
    phases.push({
      id: `reintro-${categoryId}`,
      type: 'reintroduction',
      label: `Znovuzavedení: ${cat?.nameCs ?? categoryId}`,
      startDate: cursor,
      endDate: reintroEnd,
      categoryIds: [categoryId],
      description: `Postupně zařazujte ${cat?.nameCs?.toLowerCase() ?? categoryId} zpět do jídelníčku. Sledujte kůži miminka každý den.`,
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
    label: 'Klidový režim',
    startDate: restStart,
    endDate: restEnd,
    categoryIds: [],
    description: 'Kůže se zotavuje — jezte jen potraviny, které miminko toleruje.',
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

  const cat = getCategoryById(allergenId);

  const trainingPhase: SchedulePhase = {
    id: `tolerance-building-${allergenId}`,
    type: 'tolerance-building',
    label: `Budování tolerance: ${cat?.nameCs ?? allergenId}`,
    startDate: trainingStart,
    endDate: '', // open-ended — no fixed end date
    categoryIds: [allergenId],
    description: `Malé dávky ${cat?.nameCs?.toLowerCase() ?? allergenId} max 2× týdně pro budování tolerance. Pokračujte, dokud miminko alergen toleruje.`,
  };

  const phases = [...schedule.phases, trainingPhase];
  return { ...schedule, phases };
}

// ── Append re-test phases for confirmed baby allergies ────────

export function appendReTestPhases(
  schedule: GeneratedSchedule,
  ids: string[],
  _severity: EczemaSeverity
): GeneratedSchedule {
  const reintroductionDays = 4;
  const newPhases = [...schedule.phases];
  let cursor = addDays(schedule.estimatedEndDate, 1);

  for (const categoryId of ids) {
    const cat = getCategoryById(categoryId);
    const end = addDays(cursor, reintroductionDays - 1);
    newPhases.push({
      id: `retest-${categoryId}-${cursor}`,
      type: 'reintroduction',
      label: `Otestování: ${cat?.nameCs ?? categoryId}`,
      startDate: cursor,
      endDate: end,
      categoryIds: [categoryId],
      description: `Opatrné otestování ${cat?.nameCs?.toLowerCase() ?? categoryId} pod lékařským dohledem nebo s velkou opatrností.`,
    });
    cursor = addDays(end, 1);
  }

  const newEndDate = addDays(cursor, -1);
  return { ...schedule, phases: newPhases, estimatedEndDate: newEndDate };
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
