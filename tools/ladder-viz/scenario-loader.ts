// Loads a `*.yaml` scenario into the shared event-stream type the journey and
// cascade render (#532, PRD #527). The YAML is Zod-validated on load — a typo,
// a bad enum, an unknown allergen, or a non-strict date sequence is a loud load
// error, never a silently-reconstructed run. NO decision logic lives here: the
// loader only *constructs* the domain records (meals / skin / evaluations) the
// real engine reads, exactly like the hard-coded `scenario.ts` it replaces.
import { load as parseYaml } from 'js-yaml';
import { z } from 'zod';

import { ALLERGENS } from '$lib/data/allergen-catalog';
import type { Ladder } from '$lib/domain/canonical-allergen';
import type {
  LadderAllergenId,
  Meal,
  PortionKind,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { cadenceForPhase, stabilityWindowFor } from '$lib/domain/policy';

import type { JourneyRun } from './journey';

const PORTION_KINDS = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'] as const;
const OUTCOMES = ['tolerated', 'mild-reaction', 'clear-reaction', 'severe-reaction'] as const;
const PHASES = ['tolerance-building', 'reintroduction'] as const;
const STAGES = ['breastfed', 'mixed', 'solids'] as const;

/** The ladder-bearing catalog allergens, keyed by id — the engine walks these. */
const LADDERS = new Map<LadderAllergenId, Ladder>(
  ALLERGENS.flatMap((a) =>
    'ladder' in a && a.ladder ? [[a.id as LadderAllergenId, a.ladder as Ladder]] : [],
  ),
);

const mealEvent = z.object({ meal: z.union([z.enum(PORTION_KINDS), z.literal('none')]) });
const skinEvent = z.object({
  skin: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});
const evalEvent = z.object({ eval: z.enum(OUTCOMES) });
const dayEvent = z.union([mealEvent, skinEvent, evalEvent]);

// `allergen` is external input, so it is validated at this boundary against the
// catalog rather than trusted: an id with no ladder is a loud load error, and
// the refinement narrows the parsed value to `LadderAllergenId` (no cast).
const allergenId = z
  .string()
  .refine((id): id is LadderAllergenId => LADDERS.has(id as LadderAllergenId), {
    message: 'unknown allergen (no ladder in the catalog)',
  });

const scenarioSchema = z.object({
  allergen: allergenId,
  phase: z.enum(PHASES),
  stage: z.enum(STAGES),
  permanent: z.boolean().default(false),
  days: z.array(
    z.object({
      date: z.string(),
      events: z.array(dayEvent).default([]),
    }),
  ),
});

type ScenarioDoc = z.infer<typeof scenarioSchema>;

// `other:<id>` guarantees a meal registers as a dose for the allergen without
// wiring up the food catalog — `foodTriggers` slices the prefix (`ladder.ts`).
function dose(allergen: LadderAllergenId, date: string, amount: PortionKind): Meal {
  return {
    id: `${date}:lunch`,
    date,
    mealType: 'lunch',
    actor: 'mother',
    items: [{ id: `${date}-dose`, name: allergen, foodId: `other:${allergen}`, amount }],
    createdAt: `${date}T12:00:00`,
  };
}

function cleanMeal(date: string): Meal {
  return {
    id: `${date}:lunch`,
    date,
    mealType: 'lunch',
    actor: 'mother',
    items: [{ id: `${date}-clean`, name: 'bez alergenu', foodId: 'other:none', amount: 'portion' }],
    createdAt: `${date}T12:00:00`,
  };
}

function skin(date: string, level: RegionLevel): SkinObservation {
  return {
    id: `${date}-skin`,
    date,
    createdAt: `${date}T08:00:00`,
    regions: level === 0 ? [] : [{ id: 'face', level }],
  };
}

function evaluation(
  allergen: LadderAllergenId,
  date: string,
  outcome: (typeof OUTCOMES)[number],
): ReintroductionEvaluation {
  return { phaseId: 'p1', phaseType: 'allergen-test', outcome, allergenId: allergen, date };
}

/** String date math via a UTC anchor so it never shifts across a local TZ. */
function nextISO(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Enforce strict, consecutive, ascending dates (#523): the author lists every
 * calendar day explicitly and the tool does no gap-filling or reordering, so a
 * duplicate, out-of-order, or skipped date is a loud load error rather than a
 * gap the tool silently reconstructs.
 */
function assertStrictDates(dates: readonly string[]): void {
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]!;
    const curr = dates[i]!;
    const expected = nextISO(prev);
    if (curr !== expected) {
      throw new Error(
        `scenario: dates must be strict, consecutive, ascending — expected ${expected} after ${prev}, got ${curr}`,
      );
    }
  }
}

/** Parse + Zod-validate one scenario's YAML into the shared `JourneyRun`. */
export function parseScenario(yamlText: string): JourneyRun {
  const doc: ScenarioDoc = scenarioSchema.parse(parseYaml(yamlText));
  const dates = doc.days.map((d) => d.date);
  assertStrictDates(dates);

  const allergen = doc.allergen;

  const meals: Meal[] = [];
  const observations: SkinObservation[] = [];
  const evaluations: ReintroductionEvaluation[] = [];

  for (const day of doc.days) {
    for (const event of day.events) {
      if ('meal' in event) {
        meals.push(
          event.meal === 'none' ? cleanMeal(day.date) : dose(allergen, day.date, event.meal),
        );
      } else if ('skin' in event) {
        observations.push(skin(day.date, event.skin));
      } else {
        evaluations.push(evaluation(allergen, day.date, event.eval));
      }
    }
  }

  return {
    allergenId: allergen,
    defaultLadder: LADDERS.get(allergen)!,
    stage: doc.stage,
    cadenceDays: cadenceForPhase(doc.phase),
    stabilityWindowDays: stabilityWindowFor(doc.phase),
    isPermanentlyEliminated: doc.permanent,
    events: { meals, observations, evaluations },
    days: dates,
  } satisfies JourneyRun;
}
