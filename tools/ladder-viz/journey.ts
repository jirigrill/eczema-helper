import type { Ladder } from '$lib/domain/canonical-allergen';
import type { LadderDecision, LadderExplain } from '$lib/domain/ladder';
import { explainLadderMove } from '$lib/domain/ladder';
import type {
  FeedingStage,
  LadderAllergenId,
  Meal,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';

/**
 * The situation-centric vocabulary (#519): each `LadderDecision` arm maps 1:1 to
 * one of these, plus the three future arms the engine does not emit yet. The
 * inspector renders raw decisions, but this classifier stays as the shared name
 * for a day's situation — the scenario suite asserts the *situations* a run
 * visits, not raw decision kinds.
 */
export type JourneyNodeKind =
  | 'not-started'
  | 'climbing'
  | 'holding-cadence'
  | 'holding-skin'
  | 'resting'
  | 'dwelling'
  | 'settled'
  | 'ceiling-floor-exhaustion'
  | 'blocked'
  | 'adapting-decelerate'
  | 'suspected-reaction'
  | 'ceiling-severe';

/**
 * Map one day's `LadderDecision` to its journey situation via an exhaustive
 * switch (#519, #530): a new engine arm the switch does not handle breaks the
 * build (the `never` default), so the vocabulary can never silently drift from
 * the engine.
 */
export function journeyNodeKind(decision: LadderDecision): JourneyNodeKind {
  switch (decision.kind) {
    case 'advance':
      return 'climbing';
    case 'hold':
      return decision.reason === 'skin-worsening' ? 'holding-skin' : 'holding-cadence';
    case 'rest':
      return 'resting';
    case 'passed':
      return 'dwelling';
    case 'settled':
      return 'settled';
    case 'blocked':
      return 'blocked';
    case 'ceiling-reached':
      return decision.reason === 'severe' ? 'ceiling-severe' : 'ceiling-floor-exhaustion';
    case 'adapting-decelerate':
      return 'adapting-decelerate';
    case 'suspected-reaction':
      return 'suspected-reaction';
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

/** The three event streams the engine replays, plus its calendar. */
export type RunEvents = {
  meals: Meal[];
  observations: SkinObservation[];
  evaluations: ReintroductionEvaluation[];
};

/** Everything needed to replay one allergen's run day-by-day. */
export type JourneyRun = {
  allergenId: LadderAllergenId;
  defaultLadder: Ladder;
  stage: FeedingStage;
  cadenceDays: number;
  stabilityWindowDays: number;
  /** True for a `permanent-mother`/`permanent-baby` allergen — blocked from day one (ADR-0012). */
  isPermanentlyEliminated?: boolean;
  events: RunEvents;
  days: readonly string[];
};

/** One calendar day of a run, resolved through the real `explainLadderMove` seam. */
export type DayResolution = {
  date: string;
  explain: LadderExplain;
};

/**
 * Resolve a run day-by-day through the real `explainLadderMove` seam — one
 * `DayResolution` per calendar day, uncollapsed (the single-day inspector scrubs
 * every day, so unlike the retired spine nothing is merged). Each day clips the
 * event streams to `date <= today`, because the engine reads whole history and
 * future events must be withheld. The engine is the single source of truth; this
 * only feeds it the right window per day.
 */
export function replayDays(run: JourneyRun): DayResolution[] {
  return run.days.map((today) => ({
    date: today,
    explain: explainLadderMove({
      allergenId: run.allergenId,
      meals: run.events.meals.filter((m) => m.date <= today),
      evaluations: run.events.evaluations.filter((e) => e.date <= today),
      observations: run.events.observations.filter((o) => o.date <= today),
      defaultLadder: run.defaultLadder,
      stage: run.stage,
      today,
      cadenceDays: run.cadenceDays,
      stabilityWindowDays: run.stabilityWindowDays,
      isPermanentlyEliminated: run.isPermanentlyEliminated,
    }),
  }));
}

/** The single day of a run, resolved. Returns `null` for a date outside the calendar. */
export function resolveDay(run: JourneyRun, date: string): DayResolution | null {
  return run.days.includes(date) ? (replayDays(run).find((d) => d.date === date) ?? null) : null;
}
