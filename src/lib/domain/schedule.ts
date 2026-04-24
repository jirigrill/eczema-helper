import type { QuestionnaireAnswers, GeneratedSchedule, SchedulePhase, MealItem, EczemaSeverity, ReintroductionDayInfo, Meal, DailyAssessment, ReintroductionEvaluation, AllergenOutcome, SkinStatusOutcome, TrainingReminder } from '$lib/domain/models';
import { PROTOCOL_SLUGS, REINTRODUCTION_ORDER, getCategoryBySlug } from '$lib/data/categories';
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
    categorySlugs: [],
    description: 'Jezte normálně (kromě potvrzených alergií). Zaznamenáváme výchozí stav kůže miminka před zahájením eliminace.',
  });
  cursor = addDays(resetEnd, 1);

  // Phase A: Full elimination
  const elimEnd = addDays(cursor, durations.elimination - 1);
  phases.push({
    id: 'elimination',
    type: 'elimination',
    label: 'Eliminační fáze',
    startDate: cursor,
    endDate: elimEnd,
    categorySlugs: PROTOCOL_SLUGS,
    description: 'Vylučte všechny sledované alergeny. Čekáme, až se stav kůže miminka ustálí.',
  });
  cursor = addDays(elimEnd, 1);

  // Phase B: Sequential reintroduction (4 days each — 3 escalating eating days + evaluation day)
  const reintroQueue = REINTRODUCTION_ORDER.filter(
    slug => !permanentEliminations.includes(slug)
  );
  for (const slug of reintroQueue) {
    const cat = getCategoryBySlug(slug);
    const reintroEnd = addDays(cursor, durations.reintroduction - 1);
    phases.push({
      id: `reintro-${slug}`,
      type: 'reintroduction',
      label: `Znovuzavedení: ${cat?.nameCs ?? slug}`,
      startDate: cursor,
      endDate: reintroEnd,
      categorySlugs: [slug],
      description: `Postupně zařazujte ${cat?.nameCs?.toLowerCase() ?? slug} zpět do jídelníčku. Sledujte kůži miminka každý den.`,
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
// During elimination: all protocol slugs eliminated.
// During reintroduction of X: X is allowed, already-passed allergens allowed, others eliminated.
// During rest: like elimination but already-passed allergens are allowed.
// During training: training allergen allowed in small doses, otherwise like current context.
// After all phases: only permanent eliminations.

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
    for (const slug of PROTOCOL_SLUGS) {
      if (!schedule.permanentEliminations.includes(slug)) {
        eliminated.add(slug);
      }
    }
    return [...eliminated];
  }

  if (phase.type === 'reintroduction' || phase.type === 'rest') {
    const thisIndex = schedule.phases.indexOf(phase);
    const alreadyPassed = getPassedAllergens(schedule, thisIndex);

    for (const slug of PROTOCOL_SLUGS) {
      if (
        !schedule.permanentEliminations.includes(slug) &&
        !alreadyPassed.has(slug) &&
        !(phase.type === 'reintroduction' && phase.categorySlugs.includes(slug))
      ) {
        eliminated.add(slug);
      }
    }
    return [...eliminated];
  }

  if (phase.type === 'training') {
    // Training phases are concurrent — find the "real" phase context from surrounding phases
    const trainingSlug = phase.categorySlugs[0];
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
      baseEliminated.delete(trainingSlug);
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
        for (const s of p.categorySlugs) passed.add(s);
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
    item => item.categorySlug !== null && eliminatedSlugs.includes(item.categorySlug)
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

  const allergenSlug = phase.categorySlugs[0];
  if (!allergenSlug) return null;

  const phaseStart = new Date(phase.startDate + 'T00:00:00');
  const target = new Date(date + 'T00:00:00');
  const dayInPhase = Math.round((target.getTime() - phaseStart.getTime()) / 86400000) + 1;

  const totalDays = Math.round(
    (new Date(phase.endDate + 'T00:00:00').getTime() - phaseStart.getTime()) / 86400000
  ) + 1;

  const entry = REINTRO_4DAY[Math.min(dayInPhase - 1, REINTRO_4DAY.length - 1)];

  return { dayInPhase, totalDays, allergenSlug, ...entry };
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
    categorySlugs: [],
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
  allergenSlug: string,
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

  const cat = getCategoryBySlug(allergenSlug);

  const trainingPhase: SchedulePhase = {
    id: `training-${allergenSlug}`,
    type: 'training',
    label: `Trénink: ${cat?.nameCs ?? allergenSlug}`,
    startDate: trainingStart,
    endDate: '', // open-ended — no fixed end date
    categorySlugs: [allergenSlug],
    description: `Malé dávky ${cat?.nameCs?.toLowerCase() ?? allergenSlug} max 2× týdně pro budování tolerance. Pokračujte, dokud miminko alergen toleruje.`,
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
    const slug = phase.categorySlugs[0];
    const cat = getCategoryBySlug(slug);

    const relevantMeals = meals
      .filter(m => m.date <= date && m.items.some(i => i.categorySlug === slug))
      .sort((a, b) => b.date.localeCompare(a.date));

    const lastDate = relevantMeals[0]?.date;
    const daysSince = lastDate
      ? Math.round((new Date(date + 'T00:00:00').getTime() - new Date(lastDate + 'T00:00:00').getTime()) / 86400000)
      : 999;

    return {
      allergenSlug: slug,
      daysSinceLastDose: daysSince,
      label: `${cat?.icon ?? ''} ${cat?.nameCs ?? slug}`,
    };
  }).filter(r => r.daysSinceLastDose >= 3);
}

// ── Append re-test phases for confirmed baby allergies ────────

export function appendReTestPhases(
  schedule: GeneratedSchedule,
  slugs: string[],
  _severity: EczemaSeverity
): GeneratedSchedule {
  const reintroductionDays = 4;
  const newPhases = [...schedule.phases];
  let cursor = addDays(schedule.estimatedEndDate, 1);

  for (const slug of slugs) {
    const cat = getCategoryBySlug(slug);
    const end = addDays(cursor, reintroductionDays - 1);
    newPhases.push({
      id: `retest-${slug}-${cursor}`,
      type: 'reintroduction',
      label: `Otestování: ${cat?.nameCs ?? slug}`,
      startDate: cursor,
      endDate: end,
      categorySlugs: [slug],
      description: `Opatrné otestování ${cat?.nameCs?.toLowerCase() ?? slug} pod lékařským dohledem nebo s velkou opatrností.`,
    });
    cursor = addDays(end, 1);
  }

  const newEndDate = addDays(cursor, -1);
  return { ...schedule, phases: newPhases, estimatedEndDate: newEndDate };
}

// ── Demo data generation ─────────────────────────────────────
// Generates sample meals, assessments, evaluations for completed phases.
// Simulates eggs failing (clear-reaction) with rest day + training phase.

export function generateDemoData(
  schedule: GeneratedSchedule,
  simulatedToday: string
): { meals: Meal[]; assessments: DailyAssessment[]; evaluations: ReintroductionEvaluation[]; mutatedSchedule: GeneratedSchedule } {
  const meals: Meal[] = [];
  const assessments: DailyAssessment[] = [];
  const evaluations: ReintroductionEvaluation[] = [];
  let mutatedSchedule = schedule;

  // Reset phase: baseline evaluation
  const resetPhase = schedule.phases.find(p => p.type === 'reset');
  if (resetPhase && resetPhase.endDate <= simulatedToday) {
    evaluations.push({
      phaseId: resetPhase.id,
      phaseType: 'skin-status',
      outcome: 'unchanged' as SkinStatusOutcome,
      notes: 'Výchozí stav kůže zdokumentován',
      date: resetPhase.endDate,
    });
    assessments.push({
      date: resetPhase.endDate,
      status: 'unchanged',
      notes: 'Výchozí stav — referenční bod',
      photoTaken: true,
    });
  }

  // Elimination phase: skin improved
  const elimPhase = schedule.phases.find(p => p.type === 'elimination');
  if (elimPhase && elimPhase.endDate <= simulatedToday) {
    evaluations.push({
      phaseId: elimPhase.id,
      phaseType: 'skin-status',
      outcome: 'improved' as SkinStatusOutcome,
      notes: 'Kůže se výrazně zlepšila po eliminaci',
      date: elimPhase.endDate,
    });
    assessments.push({
      date: elimPhase.endDate,
      status: 'improved',
      notes: 'Kůže klidnější, méně zarudnutí',
      photoTaken: true,
    });
  }

  // Reintroduction phases — soy fails, others pass
  const reintroPhases = schedule.phases.filter(p => p.type === 'reintroduction');
  let scheduleAlreadyMutated = false;

  for (const phase of reintroPhases) {
    const slug = phase.categorySlugs[0];
    const cat = getCategoryBySlug(slug);
    if (!cat) continue;

    const isSoyFailing = slug === 'soy';

    const totalDays = Math.round(
      (new Date(phase.endDate + 'T00:00:00').getTime() - new Date(phase.startDate + 'T00:00:00').getTime()) / 86400000
    ) + 1;

    for (let d = 0; d < totalDays; d++) {
      const date = addDays(phase.startDate, d);
      if (date > simulatedToday) break;

      // Meal with the allergen (every day is an eating day)
      const subItem = cat.subItems[0];
      meals.push({
        id: `demo-reintro-${phase.id}-d${d}-meal`,
        date,
        mealType: d === 0 ? 'breakfast' : d === 1 ? 'lunch' : 'dinner',
        items: [
          { id: `demo-ri-${phase.id}-d${d}-i1`, name: subItem?.nameCs ?? cat.nameCs, categorySlug: cat.slug, amount: d === 0 ? 'teaspoon' : d === 1 ? 'spoon' : 'portion' },
          { id: `demo-ri-${phase.id}-d${d}-i2`, name: 'Rýže', categorySlug: null, amount: 'portion' },
        ],
        savedAt: d === 0 ? '08:00' : d === 1 ? '12:30' : '18:00',
      });

      // Assessment — worsening on soy days 2+
      if (isSoyFailing && d >= 1) {
        assessments.push({
          date,
          status: 'worsened',
          notes: d === 1 ? 'Zarudnutí na tvářích' : 'Zhoršení pokračuje',
          photoTaken: d === 1 || d === totalDays - 1,
        });
      } else {
        assessments.push({
          date,
          status: 'unchanged',
          notes: undefined,
          photoTaken: d === 0 || d === totalDays - 1,
        });
      }

      // Evaluation on last day
      if (d === totalDays - 1 && date <= simulatedToday) {
        if (isSoyFailing) {
          evaluations.push({
            phaseId: phase.id,
            phaseType: 'allergen-test',
            outcome: 'clear-reaction' as AllergenOutcome,
            allergenSlug: slug,
            notes: 'Zarudnutí na tvářích 2. den, zhoršení pokračovalo',
            date,
          });
          // Mutate schedule: insert rest day + training
          if (!scheduleAlreadyMutated) {
            mutatedSchedule = insertRestDays(mutatedSchedule, phase.id, 1);
            mutatedSchedule = addTrainingPhase(mutatedSchedule, slug, phase.id);
            scheduleAlreadyMutated = true;
          }
        } else {
          evaluations.push({
            phaseId: phase.id,
            phaseType: 'allergen-test',
            outcome: 'tolerated' as AllergenOutcome,
            allergenSlug: slug,
            notes: `${cat.nameCs} bez problémů`,
            date,
          });
        }
      }
    }
  }

  // Rest phase assessments
  const restPhases = mutatedSchedule.phases.filter(p => p.type === 'rest');
  for (const rest of restPhases) {
    if (rest.startDate <= simulatedToday) {
      assessments.push({
        date: rest.startDate,
        status: 'improved',
        notes: 'Kůže se zklidňuje',
        photoTaken: false,
      });
    }
  }

  // Training demo meals — small soy meals scattered through the ongoing training
  const trainingPhase = mutatedSchedule.phases.find(p => p.type === 'training' && p.categorySlugs[0] === 'soy');
  if (trainingPhase) {
    const soyCat = getCategoryBySlug('soy');
    const soySubItem = soyCat?.subItems[0];
    // Training meals every ~3-4 days (max 2×/week per guide)
    const trainingDates = [3, 7, 11, 14, 18, 22, 25];
    for (let i = 0; i < trainingDates.length; i++) {
      const tDate = addDays(trainingPhase.startDate, trainingDates[i]);
      if (tDate > simulatedToday) break;
      meals.push({
        id: `demo-training-soy-${i}`,
        date: tDate,
        mealType: i % 2 === 0 ? 'snack' : 'lunch',
        items: [
          { id: `demo-tr-s${i}`, name: soySubItem?.nameCs ?? 'Sója', categorySlug: 'soy', amount: 'teaspoon' },
          ...(i % 2 === 1 ? [{ id: `demo-tr-s${i}b`, name: 'Zelenina', categorySlug: null as string | null, amount: 'portion' as const }] : []),
        ],
        savedAt: i % 2 === 0 ? '15:00' : '12:00',
      });
    }
  }

  return { meals, assessments, evaluations, mutatedSchedule };
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
