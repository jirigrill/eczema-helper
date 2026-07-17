// ═══════════════════════════════════════════════════════════
// PROTOTYPE engine harness — a DUMB trace adapter, holds NO logic.
//
// It only (a) turns a scenario into genuine Meal / SkinObservation /
// ReintroductionEvaluation objects and (b) calls the REAL decideLadderMove
// with tracing enabled, then hands back the raw LadderTrace the engine
// authored. There is no re-derivation here: no "which gate fired" inference,
// no hand-written condition strings, no passed/not-reached reconstruction.
// Every gate label, condition, input and outcome comes straight out of the
// engine's own trace, so any change to the engine propagates to the visualizer
// for free. Delete with the prototype folder.
// ═══════════════════════════════════════════════════════════
import {
  decideLadderMove,
  resolveLadder,
  type Ladder,
  type LadderStep,
  type LadderDecision,
  type LadderTrace,
  type FeedingStage,
} from '$lib/domain/ladder';
import type {
  Meal,
  MealType,
  SkinObservation,
  ReintroductionEvaluation,
  PortionKind,
  AllergenOutcome,
  RegionLevel,
  LadderAllergenId,
  FoodId,
} from '$lib/domain/models';
import { ALLERGENS, FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import { cadenceForPhase, stabilityWindowFor, type LadderPhase } from '$lib/domain/policy';
import { mealId } from '$lib/domain/models';

export const DOSES: PortionKind[] = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'];
export const OUTCOMES: AllergenOutcome[] = [
  'tolerated',
  'mild-reaction',
  'clear-reaction',
  'severe-reaction',
];

// A day can carry several meals and several skin observations — the scenario
// models each event independently and the harness groups them by date.
export type ScenarioEvent =
  | { date: string; kind: 'meal'; dose: PortionKind; note?: string }
  | { date: string; kind: 'eval'; outcome: AllergenOutcome; note?: string }
  | { date: string; kind: 'skin'; severity: RegionLevel; note?: string };

export type Scenario = {
  allergen: LadderAllergenId;
  phase: LadderPhase;
  stage: FeedingStage;
  permanent?: boolean;
  events: ScenarioEvent[];
};

/** One evaluated day: the inputs the mother contributed that day (possibly
 *  several), the engine's verdict, and the engine-authored trace behind it. */
export type Step = {
  date: string;
  /** Everything that landed on this date — multiple meals/skins/evals allowed. */
  events: ScenarioEvent[];
  verdict: LadderDecision;
  /** The raw trace the engine emitted for this day — rendered blindly. */
  trace: LadderTrace;
};

export type RunResult = {
  ladder: LadderStep[];
  steps: Step[];
  error?: string;
};

/** The worked example: dairy climb → clear-reaction → walk-down → re-confirm,
 *  with a couple of multi-event days to exercise grouping. */
export const DEFAULT_SCENARIO: Scenario = {
  allergen: 'dairy' as LadderAllergenId,
  phase: 'tolerance-building',
  stage: 'mixed',
  events: [
    { date: '2026-06-01', kind: 'meal', dose: 'pinch', note: 'first dose, rung 1' },
    { date: '2026-06-01', kind: 'skin', severity: 1, note: 'mild baseline, same day' },
    { date: '2026-06-05', kind: 'meal', dose: 'teaspoon', note: 'climb to rung 2' },
    { date: '2026-06-09', kind: 'meal', dose: 'teaspoon', note: 'climb to rung 3' },
    { date: '2026-06-13', kind: 'meal', dose: 'spoon', note: 'climb to rung 4' },
    { date: '2026-06-14', kind: 'skin', severity: 2, note: 'morning check' },
    { date: '2026-06-14', kind: 'skin', severity: 3, note: 'evening — worsening' },
    { date: '2026-06-15', kind: 'eval', outcome: 'clear-reaction', note: 'binds → walk down' },
    { date: '2026-06-22', kind: 'meal', dose: 'teaspoon', note: 're-confirm stepped-down rung' },
  ],
};

function defaultLadderFor(allergen: LadderAllergenId): Ladder | null {
  const a = ALLERGENS.find((x) => x.id === allergen) as { ladder?: Ladder } | undefined;
  return a?.ladder ?? null;
}

function foodTriggering(allergen: LadderAllergenId): string {
  const f = FOODS.find((x) => (x.allergenIds as readonly string[]).includes(allergen));
  return f ? f.id : `other:${allergen}`;
}

/**
 * Run the scenario through the REAL engine. For each distinct date we assemble
 * the genuine history known so far, call `decideLadderMove` with a fresh trace
 * sink, and store the trace verbatim. The harness knows nothing about gates.
 */
export function runScenario(scenario: Scenario): RunResult {
  const defaultLadder = defaultLadderFor(scenario.allergen);
  if (!defaultLadder) {
    return { ladder: [], steps: [], error: `no ladder in catalog for '${scenario.allergen}'` };
  }
  const ladderSteps = (resolveLadder(defaultLadder, null).stages[scenario.stage] ??
    []) as LadderStep[];
  const cadenceDays = cadenceForPhase(scenario.phase);
  const stabilityWindowDays = stabilityWindowFor(scenario.phase);
  const foodId = foodTriggering(scenario.allergen);

  // Materialize every event into a genuine domain object up front.
  const meals: Meal[] = [];
  const observations: SkinObservation[] = [];
  const evaluations: ReintroductionEvaluation[] = [];

  const sorted = [...scenario.events].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((e, i) => {
    if (e.kind === 'meal') {
      const mt: MealType = 'lunch';
      meals.push({
        id: mealId(e.date, mt),
        date: e.date,
        mealType: mt,
        actor: 'mother',
        items: [{ id: `it-${i}`, name: scenario.allergen, foodId: foodId as FoodId, amount: e.dose }],
        // Distinct createdAt per meal so same-day doses keep their order.
        createdAt: `${e.date}T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
      });
    } else if (e.kind === 'skin') {
      observations.push({
        id: `sk-${i}`,
        date: e.date,
        createdAt: `${e.date}T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
        regions: [{ id: 'face', level: e.severity }],
      });
    } else {
      evaluations.push({
        phaseId: `ph-${i}`,
        phaseType: 'allergen-test',
        outcome: e.outcome,
        allergenId: scenario.allergen,
        date: e.date,
      });
    }
  });

  // One step per distinct date, preserving chronological order.
  const dates = [...new Set(sorted.map((e) => e.date))].sort();
  const steps: Step[] = dates.map((today) => {
    const mealsSoFar = meals.filter((m) => m.date <= today);
    const obsSoFar = observations.filter((o) => o.date <= today);
    const evalsSoFar = evaluations.filter((v) => v.date <= today);

    // REAL engine call, trace enabled. The trace is the ONLY thing we render.
    const trace: LadderTrace = { gates: [], state: null };
    const verdict = decideLadderMove(
      {
        allergenId: scenario.allergen,
        meals: mealsSoFar,
        evaluations: evalsSoFar,
        observations: obsSoFar,
        defaultLadder,
        override: null,
        stage: scenario.stage,
        today,
        cadenceDays,
        stabilityWindowDays,
        isPermanentlyEliminated: scenario.permanent ?? false,
      },
      trace,
    );

    return {
      date: today,
      events: sorted.filter((e) => e.date === today),
      verdict,
      trace,
    };
  });

  return { ladder: ladderSteps, steps };
}
