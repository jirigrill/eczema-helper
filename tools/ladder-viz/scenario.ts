// PROTOTYPE — throwaway (ticket #522). Pure data: the ladder, the event
// builders, the canned scenario, the calendar. NO engine decision logic lives
// here — this file only *constructs* domain records (meals / skin / evals) the
// engine will read. Safe to import from anywhere in the tool.
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  LadderAllergenId,
  Meal,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';

export const ALLERGEN_ID: LadderAllergenId = 'peanuts';
export const STAGE: FeedingStage = 'breastfed';

// A real 4-rung ladder (the engine walks whatever Ladder we hand it — no
// catalog needed). Rung 3 is an evaluation checkpoint, rung 4 the top.
export const LADDER: Ladder = {
  allergenId: ALLERGEN_ID,
  stages: {
    breastfed: [
      { id: 'r1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
      { id: 'r2', anchor: 'teaspoon', isEvaluationCheckpoint: false, dose: '¼ lžičky' },
      { id: 'r3', anchor: 'spoon', isEvaluationCheckpoint: true, dose: '½ lžičky' },
      { id: 'r4', anchor: 'portion', isEvaluationCheckpoint: false, dose: 'plná porce' },
    ],
  },
};

export const STEPS = LADDER.stages.breastfed!;

// ── Event builders (shared by the canned scenario + manual mode) ─────────────

// `other:<id>` guarantees a meal registers as a dose for the allergen without
// wiring up the food catalog — `foodTriggers` slices the prefix.
export function dose(date: string, rung: LadderStep, mealType: Meal['mealType'] = 'lunch'): Meal {
  return {
    id: `${date}:${mealType}`,
    date,
    mealType,
    actor: 'mother',
    items: [
      { id: `${date}-${rung.id}`, name: `arašíd — ${rung.dose}`, foodId: `other:${ALLERGEN_ID}`, amount: rung.anchor },
    ],
    createdAt: `${date}T12:00:00`,
  };
}

export function skin(date: string, level: RegionLevel, region = 'face' as const): SkinObservation {
  return {
    id: `${date}-skin`,
    date,
    createdAt: `${date}T08:00:00`,
    regions: level === 0 ? [] : [{ id: region, level }],
  };
}

export function evaluation(date: string, outcome: AllergenOutcome): ReintroductionEvaluation {
  return { phaseId: 'p1', phaseType: 'allergen-test', outcome, allergenId: ALLERGEN_ID, date };
}

// ── The three event streams the engine replays ──────────────────────────────

export interface ScenarioEvents {
  meals: Meal[];
  observations: SkinObservation[];
  evaluations: ReintroductionEvaluation[];
}

// An arc that exercises a real spread of the union. Doses are spaced so that
// "advance" days fall between dose days, and a `tolerated` eval clears the
// reaction so the run actually re-climbs.
export const SCENARIO: ScenarioEvents = {
  meals: [
    dose('2026-06-01', STEPS[0]!), //  dose r1
    dose('2026-06-03', STEPS[1]!), //  dose r2 (probe cadence 1)
    dose('2026-06-05', STEPS[2]!), //  dose r3 (checkpoint)
    dose('2026-06-11', STEPS[1]!), //  re-test r2 after step-back
    dose('2026-06-15', STEPS[2]!), //  re-climb r3 (confirm cadence 3)
    dose('2026-06-19', STEPS[3]!), //  reach top r4 — gap after so `passed` shows
  ],
  observations: [
    skin('2026-06-02', 1),
    skin('2026-06-03', 1),
    skin('2026-06-05', 2), // worsened 1→2 → skin-worsening hold on 06-05
    skin('2026-06-08', 1),
    skin('2026-06-12', 1),
    skin('2026-06-20', 1),
  ],
  evaluations: [
    evaluation('2026-06-06', 'mild-reaction'), // reaction at r3 → rest, then step-back
    evaluation('2026-06-11', 'tolerated'), // clears the pending reaction → re-climb
    evaluation('2026-06-26', 'mild-reaction'), // late reaction at top → re-opens a confirmed run
  ],
};

export function emptyEvents(): ScenarioEvents {
  return { meals: [], observations: [], evaluations: [] };
}

// Days the scrubber can visit.
export const DAYS: string[] = Array.from({ length: 28 }, (_, i) => addISO('2026-06-01', i));

// ── Presentation labels (cosmetic, not logic) ────────────────────────────────

export const OUTCOME_LABEL: Record<AllergenOutcome, string> = {
  tolerated: 'tolerated',
  'mild-reaction': 'mild reaction',
  'clear-reaction': 'clear reaction',
  'severe-reaction': 'severe reaction',
};

export const SEV_LABEL = ['klidné', 'mírné', 'střední', 'silné'];

// Small date helper. String math via a UTC anchor so it never shifts across a
// local-timezone boundary.
export function addISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
