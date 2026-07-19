// Pure data for the hard-coded run the visualizer replays (#530). NO decision
// logic lives here — this file only *constructs* domain records (meals / skin /
// evaluations) that the real engine reads, plus the ladder and the calendar.
// The engine is the single source of truth; the visualizer copies none of it.
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  LadderAllergenId,
  Meal,
  MealType,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { cadenceForPhase, stabilityWindowFor } from '$lib/domain/policy';

import type { JourneyRun, RunEvents } from './journey';

export const ALLERGEN_ID: LadderAllergenId = 'peanuts';
export const STAGE: FeedingStage = 'breastfed';

/**
 * The run replays the reintroduction rhythm (F4): probe cadence 1, so a clean
 * climb shows an `advance` day between doses. Sourced from `policy.ts` — the
 * visualizer never hard-codes an engine number it can read.
 */
export const CADENCE_DAYS = cadenceForPhase('reintroduction');
export const STABILITY_WINDOW_DAYS = stabilityWindowFor('reintroduction');

/** A real 4-rung ladder — the engine walks whatever `Ladder` we hand it. */
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

export const STEPS: readonly LadderStep[] = LADDER.stages.breastfed!;

// ── Event builders ──────────────────────────────────────────────────────────

// `other:<id>` guarantees a meal registers as a dose for the allergen without
// wiring up the food catalog — `foodTriggers` slices the prefix.
export function dose(date: string, rung: LadderStep, mealType: MealType = 'lunch'): Meal {
  return {
    id: `${date}:${mealType}`,
    date,
    mealType,
    actor: 'mother',
    items: [
      {
        id: `${date}-${rung.id}`,
        name: `arašíd — ${rung.dose}`,
        foodId: `other:${ALLERGEN_ID}`,
        amount: rung.anchor,
      },
    ],
    createdAt: `${date}T12:00:00`,
  };
}

export function skin(date: string, level: RegionLevel): SkinObservation {
  return {
    id: `${date}-skin`,
    date,
    createdAt: `${date}T08:00:00`,
    regions: level === 0 ? [] : [{ id: 'face', level }],
  };
}

export function evaluation(date: string, outcome: AllergenOutcome): ReintroductionEvaluation {
  return { phaseId: 'p1', phaseType: 'allergen-test', outcome, allergenId: ALLERGEN_ID, date };
}

/**
 * One canned run exercising a real spread of the union, chosen to reach the
 * reversible terminal so the honest `settled → resting` edge (#519) actually
 * renders: a fast probe climb that hits a skin-worsening hold, reaches the top
 * rung, dwells and *settles*, then a late top-rung reaction re-opens the settled
 * run into `rest` and `step-back`. Days with no event still resolve — the
 * time-triggered transitions (cadence elapsing, skin window clearing, dwell
 * latency met, settle) are the whole point of a day-by-day replay.
 */
export const RUN: RunEvents = {
  meals: [
    dose('2026-06-01', STEPS[0]!), // r1
    dose('2026-06-02', STEPS[1]!), // r2 (probe cadence 1)
    dose('2026-06-04', STEPS[2]!), // r3
    dose('2026-06-06', STEPS[3]!), // top rung r4 — dwell dose 1
    dose('2026-06-09', STEPS[3]!), // dwell dose 2 (confirm cadence)
    dose('2026-06-12', STEPS[3]!), // dwell dose 3
    dose('2026-06-15', STEPS[3]!), // dwell dose 4 → dwell count reaches the ladder length
  ],
  observations: [
    skin('2026-06-03', 1),
    skin('2026-06-04', 2), // worsened 1→2 → skin-worsening hold across the window
  ],
  evaluations: [
    evaluation('2026-06-23', 'mild-reaction'), // late top-rung reaction → re-opens the settled run
  ],
};

// ── Calendar ──────────────────────────────────────────────────────────────

/** String date math via a UTC anchor so it never shifts across a local TZ. */
export function addISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Strict, consecutive, ascending calendar the run is replayed over (#519). */
export const START_DATE = '2026-06-01';
export const DAY_COUNT = 32;
export const DAYS: readonly string[] = Array.from({ length: DAY_COUNT }, (_, i) =>
  addISO(START_DATE, i),
);

// ── The assembled run ───────────────────────────────────────────────────────

/**
 * The single `JourneyRun` the visualizer replays — assembled once here so the
 * app and its tests drive the identical run (no duplicated literal).
 */
export const RUN_INPUT: JourneyRun = {
  allergenId: ALLERGEN_ID,
  defaultLadder: LADDER,
  stage: STAGE,
  cadenceDays: CADENCE_DAYS,
  stabilityWindowDays: STABILITY_WINDOW_DAYS,
  events: RUN,
  days: DAYS,
};
