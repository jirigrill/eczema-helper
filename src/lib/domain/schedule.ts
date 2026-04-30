import type { QuestionnaireAnswers, GeneratedSchedule, SchedulePhase, MealItem, EczemaSeverity, ReintroductionDayInfo, Meal, TrainingReminder } from '$lib/domain/models';
import { getCategoryById } from '$lib/data/categories';
import { addDays, isDateInRange } from '$lib/utils/date';

// ── Schedule generation ───────────────────────────────────────

function phaseDurations(severity: EczemaSeverity) {
  return {
    reset: 5,
    elimination: severity === 'severe' ? 21 : 14,
    reintroduction: 4,
  };
}

export function generateSchedule(answers: QuestionnaireAnswers): GeneratedSchedule {
  const durations = phaseDurations(answers.eczemaSeverity);
  const permanentEliminations = [
    ...new Set(
      [...answers.motherAllergies, ...answers.babyConfirmedAllergies]
        .map(s => s.includes(':') && !s.startsWith('other:') ? s.split(':')[0] : s)
    ),
  ];

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
    permanentEliminations,
    startDate,
    estimatedEndDate: lastPhase.endDate,
  };
}

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
// Permanent eliminations always apply.
// During reset: only permanent eliminations — mother eats normally.
// During elimination: the phase's own categoryIds (= tested allergens).
// During reintroduction of X: X is allowed, already-passed allergens allowed, others eliminated.
// During rest: like elimination but already-passed allergens are allowed.
// During training: training allergen allowed in small doses, otherwise like current context.
// After all phases: only permanent eliminations.

// Derive the protocol from the schedule's elimination phase so it stays data-driven.
function getProtocolIds(schedule: GeneratedSchedule): string[] {
  const elimPhase = schedule.phases.find(p => p.type === 'elimination');
  return elimPhase?.categoryIds ?? [];
}

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

// ── Schedule mutation: insert rest days ──────────────────────

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

  // Shift all non-training phases after idx forward by `days`
  for (let i = idx + 1; i < phases.length; i++) {
    if (phases[i].type !== 'training') {
      phases[i] = {
        ...phases[i],
        startDate: addDays(phases[i].startDate, days),
        endDate: addDays(phases[i].endDate, days),
      };
    }
  }

  phases.splice(idx + 1, 0, restPhase);

  const lastNonTraining = [...phases].reverse().find(p => p.type !== 'training');
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
    id: `training-${allergenId}`,
    type: 'training',
    label: `Trénink: ${cat?.nameCs ?? allergenId}`,
    startDate: trainingStart,
    endDate: '', // open-ended — no fixed end date
    categoryIds: [allergenId],
    description: `Malé dávky ${cat?.nameCs?.toLowerCase() ?? allergenId} max 2× týdně pro budování tolerance. Pokračujte, dokud miminko alergen toleruje.`,
  };

  const phases = [...schedule.phases, trainingPhase];
  return { ...schedule, phases };
}

// ── Training reminders for a given date ──────────────────────

export function getTrainingRemindersForDate(
  schedule: GeneratedSchedule,
  date: string,
  meals: Meal[]
): TrainingReminder[] {
  const trainingPhases = schedule.phases.filter(
    p => p.type === 'training' && date >= p.startDate && (p.endDate === '' || date <= p.endDate)
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
