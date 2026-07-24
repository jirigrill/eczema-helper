// The one canned run the visualizer's *tests* replay (#530). NO decision logic
// lives here — this file only holds a hand-crafted ladder + calendar and assembles
// domain records (meals / skin / evaluations) via the shared `run-events.ts`
// builders, so the fixture and the two live modes construct identical records and
// cannot drift. The engine is the single source of truth; nothing here copies it.
// (App.svelte renders the YAML scenarios, not this run; this survives only as a
// `replayDays` fixture whose custom ladder exercises a real spread of verdicts.)
import type { Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  FeedingStage,
  LadderAllergenId,
  Meal,
  ReintroductionEvaluation,
} from '$lib/domain/models';
import { cadenceForPhase, stabilityWindowFor } from '$lib/domain/policy';

import type { JourneyRun, RunEvents } from './journey';
import { addISO, evaluation as evaluationRecord, lunchMeal, skinObservation } from './run-events';

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
// All three delegate to the shared `run-events.ts` builders so the fixture's
// records are byte-identical to what the live modes construct. Only `dose` needs
// a fixture-local wrapper: it doses a *specific rung* (labelling the item by the
// rung's dose text), where the live builder doses a bare portion amount.

/** Dose the given rung — a rung-labelled meal item on the shared lunch envelope. */
export function dose(date: string, rung: LadderStep): Meal {
  return lunchMeal(date, {
    id: `${date}-${rung.id}`,
    name: `arašíd — ${rung.dose}`,
    foodId: `other:${ALLERGEN_ID}`,
    amount: rung.anchor,
  });
}

/** A skin reading, via the shared builder. */
export const skin = skinObservation;

/** An evaluation for this fixture's allergen, via the shared builder. */
export function evaluation(date: string, outcome: AllergenOutcome): ReintroductionEvaluation {
  return evaluationRecord(ALLERGEN_ID, date, outcome);
}

/**
 * One canned run exercising a real spread of the union, chosen to reach the
 * reversible terminal so the honest `settled → resting` edge (#519) actually
 * renders: a fast probe climb that hits a skin-worsening hold, reaches the top
 * rung, dwells and *settles*, then a late top-rung reaction re-opens the settled
 * run: the reaction walks the ladder *down* one rung (capping the top forever)
 * and `rest`s on the stepped-down rung, which then re-confirms in place. Days
 * with no event still resolve — the
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
