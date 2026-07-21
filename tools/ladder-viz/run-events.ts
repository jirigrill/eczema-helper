// The one place the two visualizer modes (scenario replay #532, manual #533)
// turn a run setup + dated events into the shared `JourneyRun` the journey and
// cascade render. Both modes route through `buildRun`, so they are genuinely two
// views over one event stream and cannot drift. NO decision logic lives here:
// this only *constructs* the domain records (meals / skin / evaluations) the
// real engine reads — the engine remains the single source of truth.
import { ALLERGENS } from '$lib/data/allergen-catalog';
import type { FeedingStage, Ladder } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  LadderAllergenId,
  Meal,
  PortionKind,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { cadenceForPhase, stabilityWindowFor } from '$lib/domain/policy';

import type { JourneyRun } from './journey';

export type ReintroductionPhase = 'tolerance-building' | 'reintroduction';

/** The shared per-day event vocabulary both modes validate/offer against. */
export const PORTION_KINDS: readonly PortionKind[] = [
  'pinch',
  'teaspoon',
  'spoon',
  'portion',
  'package',
];
export const OUTCOMES: readonly AllergenOutcome[] = [
  'tolerated',
  'mild-reaction',
  'clear-reaction',
  'severe-reaction',
];
export const PHASES: readonly ReintroductionPhase[] = ['tolerance-building', 'reintroduction'];
export const STAGES: readonly FeedingStage[] = ['breastfed', 'mixed', 'solids'];

/** String date math via a UTC anchor so it never shifts across a local TZ. */
export function addISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The next consecutive calendar day — one step of `addISO`, the common case. */
export function nextISO(iso: string): string {
  return addISO(iso, 1);
}

/** The run setup both modes fix at session start — a scenario header's fields. */
export type RunSetup = {
  allergen: LadderAllergenId;
  phase: ReintroductionPhase;
  stage: FeedingStage;
  permanent: boolean;
};

/** One dated event, the shared per-day vocabulary of both modes. */
export type RunEvent =
  | { date: string; meal: PortionKind | 'none' }
  | { date: string; skin: RegionLevel }
  | { date: string; eval: AllergenOutcome };

/** The ladder-bearing catalog allergens, keyed by id — the engine walks these. */
export const LADDERS = new Map<LadderAllergenId, Ladder>(
  ALLERGENS.flatMap((a) =>
    'ladder' in a && a.ladder ? [[a.id as LadderAllergenId, a.ladder as Ladder]] : [],
  ),
);

// The lunch-meal envelope both a dose and a clean meal share — only the single
// `item` differs, so it lives in one place and the two callers can't drift. Also
// the one meal envelope the `scenario.ts` test fixture builds its rung doses on,
// so the fixture and the two live modes construct identical meal records.
export function lunchMeal(date: string, item: Meal['items'][number]): Meal {
  return {
    id: `${date}:lunch`,
    date,
    mealType: 'lunch',
    actor: 'mother',
    items: [item],
    createdAt: `${date}T12:00:00`,
  };
}

// `other:<id>` guarantees a meal registers as a dose for the allergen without
// wiring up the food catalog — `foodTriggers` slices the prefix (`ladder.ts`).
function dose(allergen: LadderAllergenId, date: string, amount: PortionKind): Meal {
  return lunchMeal(date, {
    id: `${date}-dose`,
    name: allergen,
    foodId: `other:${allergen}`,
    amount,
  });
}

function cleanMeal(date: string): Meal {
  return lunchMeal(date, {
    id: `${date}-clean`,
    name: 'bez alergenu',
    foodId: 'other:none',
    amount: 'portion',
  });
}

export function skinObservation(date: string, level: RegionLevel): SkinObservation {
  return {
    id: `${date}-skin`,
    date,
    createdAt: `${date}T08:00:00`,
    regions: level === 0 ? [] : [{ id: 'face', level }],
  };
}

export function evaluation(
  allergen: LadderAllergenId,
  date: string,
  outcome: AllergenOutcome,
): ReintroductionEvaluation {
  return { phaseId: 'p1', phaseType: 'allergen-test', outcome, allergenId: allergen, date };
}

/**
 * Turn a setup + calendar + dated events into the shared `JourneyRun`. The
 * ladder, cadence, and stability window come from the setup's allergen and phase
 * via the catalog and `policy.ts` — no engine number is hard-coded.
 */
export function buildRun(
  setup: RunSetup,
  days: readonly string[],
  events: readonly RunEvent[],
): JourneyRun {
  const meals: Meal[] = [];
  const observations: SkinObservation[] = [];
  const evaluations: ReintroductionEvaluation[] = [];

  for (const event of events) {
    if ('meal' in event) {
      meals.push(
        event.meal === 'none'
          ? cleanMeal(event.date)
          : dose(setup.allergen, event.date, event.meal),
      );
    } else if ('skin' in event) {
      observations.push(skinObservation(event.date, event.skin));
    } else if ('eval' in event) {
      evaluations.push(evaluation(setup.allergen, event.date, event.eval));
    } else {
      // A new `RunEvent` variant must be handled above — never silently dropped or
      // miscategorized (matches the engine's `never` guard).
      const _exhaustive: never = event;
      throw new Error(`run-events: unknown event kind ${JSON.stringify(_exhaustive)}`);
    }
  }

  return {
    allergenId: setup.allergen,
    // `LADDERS.has(setup.allergen)` is guaranteed by callers: scenario-loader validates
    // via `allergenId` (Zod refine against LADDERS); manual-mode picks from LADDERS.keys().
    defaultLadder: LADDERS.get(setup.allergen)!,
    stage: setup.stage,
    cadenceDays: cadenceForPhase(setup.phase),
    stabilityWindowDays: stabilityWindowFor(setup.phase),
    isPermanentlyEliminated: setup.permanent,
    events: { meals, observations, evaluations },
    days,
  } satisfies JourneyRun;
}
