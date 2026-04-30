import yaml from 'js-yaml';
import type { ScenarioDayEntry } from './scenario-schema';
import { DEFAULT_TESTED_ALLERGENS, getCategoryById } from './categories';
import type { AppState, Meal, DailyAssessment, ReintroductionEvaluation, GeneratedSchedule } from '$lib/domain/models';
import { generateSchedule, insertRestDays, addTrainingPhase } from '$lib/domain/schedule';
import { addDays } from '$lib/utils/date';
import { ok, err } from '$lib/types/result';
import type { Result } from '$lib/types/result';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
const AMOUNT_SIZES = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'] as const;
const ASSESSMENT_STATUSES = ['improved', 'unchanged', 'worsened', 'new-lesions'] as const;
const SEVERITIES = ['mild', 'moderate', 'severe'] as const;

function phaseIdForDate(schedule: GeneratedSchedule, date: string, allergenId?: string): string {
  if (allergenId) {
    const reintro = schedule.phases.find(
      p => p.type === 'reintroduction' && p.categoryIds.includes(allergenId)
    );
    if (reintro) return reintro.id;
  }
  const phase = schedule.phases.find(p =>
    p.endDate === '' ? date >= p.startDate : date >= p.startDate && date <= p.endDate
  );
  return phase?.id ?? 'unknown';
}

function processDayEntry(
  entry: ScenarioDayEntry,
  date: string,
  dayIndex: number,
  schedule: GeneratedSchedule
): { meals: Meal[]; assessment: DailyAssessment | null; evaluation: ReintroductionEvaluation | null; mutateSchedule: ((s: GeneratedSchedule) => GeneratedSchedule) | null } {
  const meals: Meal[] = [];
  let assessment: DailyAssessment | null = null;
  let evaluation: ReintroductionEvaluation | null = null;
  let mutateSchedule: ((s: GeneratedSchedule) => GeneratedSchedule) | null = null;

  if (entry.assessment && ASSESSMENT_STATUSES.includes(entry.assessment as typeof ASSESSMENT_STATUSES[number])) {
    assessment = {
      date,
      status: entry.assessment,
      notes: entry.assessmentNotes,
      photoTaken: entry.assessmentPhotoTaken ?? false,
    };
  }

  if (Array.isArray(entry.meals)) {
    entry.meals.forEach((m, mi) => {
      const mealType = MEAL_TYPES.includes(m.type as typeof MEAL_TYPES[number]) ? m.type : 'breakfast';
      meals.push({
        id: `scenario-d${dayIndex}-m${mi}`,
        date,
        mealType,
        items: Array.isArray(m.items) ? m.items.map((item, ii) => {
          const resolvedSubitemId = item.subitemId ?? null;
          const resolvedCategoryId = item.categoryId
            ?? (resolvedSubitemId ? resolvedSubitemId.split(':')[0] : null);
          const resolvedName = item.name
            ?? (resolvedSubitemId
              ? getCategoryById(resolvedSubitemId.split(':')[0])?.subItems.find(s => s.subitemId === resolvedSubitemId)?.nameCs
              : undefined)
            ?? resolvedSubitemId
            ?? 'Neznámá';
          return {
            id: `scenario-d${dayIndex}-m${mi}-i${ii}`,
            name: resolvedName,
            categoryId: resolvedCategoryId,
            subitemId: resolvedSubitemId,
            amount: AMOUNT_SIZES.includes(item.amount as typeof AMOUNT_SIZES[number]) ? item.amount : 'portion',
          };
        }) : [],
        savedAt: m.savedAt ?? '12:00',
      });
    });
  }

  if (entry.evaluation) {
    const ev = entry.evaluation;
    const allergenId = ev.allergenId;
    const phaseId = phaseIdForDate(schedule, date, allergenId);
    evaluation = {
      phaseId,
      phaseType: ev.type === 'allergen-test' ? 'allergen-test' : 'skin-status',
      outcome: ev.outcome as ReintroductionEvaluation['outcome'],
      notes: ev.notes,
      date,
    };
    if (allergenId) evaluation.allergenId = allergenId;

    if (ev.type === 'allergen-test' && allergenId &&
      (ev.outcome === 'clear-reaction' || ev.outcome === 'severe-reaction')) {
      const restDays = ev.outcome === 'severe-reaction' ? 2 : 1;
      mutateSchedule = (s) => {
        let mutated = insertRestDays(s, phaseId, restDays);
        mutated = addTrainingPhase(mutated, allergenId, phaseId);
        return mutated;
      };
    }
  }

  return { meals, assessment, evaluation, mutateSchedule };
}

export function parseScenario(yamlText: string): Result<AppState> {
  let raw: unknown;
  try {
    raw = yaml.load(yamlText);
  } catch (e) {
    return err(`YAML parse error: ${e}`);
  }

  if (!raw || typeof raw !== 'object') return err('Scenario must be an object');
  const s = raw as Record<string, unknown>;

  const setup = s.setup as Record<string, unknown> | undefined;
  if (!setup) return err('Missing setup');
  if (!setup.programStartDate || typeof setup.programStartDate !== 'string') {
    return err('Missing setup.programStartDate');
  }

  const answers = {
    babyBirthDate: typeof setup.babyBirthDate === 'string' ? setup.babyBirthDate : '2024-01-01',
    eczemaSeverity: (SEVERITIES.includes(setup.eczemaSeverity as typeof SEVERITIES[number])
      ? setup.eczemaSeverity
      : 'moderate') as 'mild' | 'moderate' | 'severe',
    motherAllergies: Array.isArray(setup.motherAllergies) ? setup.motherAllergies.map(String) : [],
    babyConfirmedAllergies: Array.isArray(setup.babyConfirmedAllergies) ? setup.babyConfirmedAllergies.map(String) : [],
    programStartDate: setup.programStartDate,
    completedAt: new Date().toISOString(),
    testedAllergens: Array.isArray(setup.testedAllergens) && setup.testedAllergens.length > 0
      ? setup.testedAllergens.map(String)
      : DEFAULT_TESTED_ALLERGENS,
  };

  let schedule = generateSchedule(answers);

  const allMeals: Meal[] = [];
  const allAssessments: DailyAssessment[] = [];
  const allEvaluations: ReintroductionEvaluation[] = [];

  const daysRaw = s.days as Record<string, unknown> | undefined;
  if (daysRaw) {
    const sorted = Object.entries(daysRaw).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [idx, entry] of sorted) {
      const dayIndex = Number(idx);
      const date = addDays(answers.programStartDate, dayIndex);
      const result = processDayEntry(entry as ScenarioDayEntry, date, dayIndex, schedule);
      allMeals.push(...result.meals);
      if (result.assessment) allAssessments.push(result.assessment);
      if (result.evaluation) allEvaluations.push(result.evaluation);
      if (result.mutateSchedule) schedule = result.mutateSchedule(schedule);
    }
  }

  return ok({
    answers,
    schedule,
    meals: allMeals,
    assessments: allAssessments,
    evaluations: allEvaluations,
    dateOffset: 0,
    activeScenario: typeof s.name === 'string' ? s.name : 'Scenario',
  });
}

export async function fetchScenario(name: string): Promise<Result<AppState>> {
  try {
    const res = await fetch(`/scenarios/${name}.yaml`);
    if (!res.ok) return err(`Failed to fetch scenario "${name}": HTTP ${res.status}`);
    const text = await res.text();
    return parseScenario(text);
  } catch (e) {
    return err(`Network error fetching scenario: ${e}`);
  }
}

export async function listScenarios(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch('/scenarios/manifest.json');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
