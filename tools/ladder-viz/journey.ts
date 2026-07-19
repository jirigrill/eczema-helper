import type { FeedingStage, Ladder } from '$lib/domain/canonical-allergen';
import type { LadderDecision, LadderExplain } from '$lib/domain/ladder';
import { explainLadderMove } from '$lib/domain/ladder';
import type {
  LadderAllergenId,
  Meal,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';

/**
 * The situation-centric journey node vocabulary (#519). Each `LadderDecision`
 * arm maps 1:1 to one of these; the three future arms the engine does not emit
 * yet (`adapting-decelerate`, `suspected-reaction`, `ceiling-severe`) are in the
 * vocabulary so the tool is future-complete, plus a synthetic `not-started`
 * entry the engine never speaks.
 */
export type JourneyNodeKind =
  | 'not-started'
  | 'climbing'
  | 'holding-cadence'
  | 'holding-skin'
  | 'resting'
  | 'stepped-back'
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
 * the engine. `not-started` is not produced here — it is the synthetic entry
 * node the replay prepends, never an engine verdict.
 */
export function journeyNodeKind(decision: LadderDecision): JourneyNodeKind {
  switch (decision.kind) {
    case 'advance':
      return 'climbing';
    case 'hold':
      return decision.reason === 'skin-worsening' ? 'holding-skin' : 'holding-cadence';
    case 'rest':
      return 'resting';
    case 'step-back':
      return 'stepped-back';
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
  events: RunEvents;
  days: readonly string[];
};

/** The four `LadderDecisionInput` channels an edge can carry (#519). */
export type JourneyEdgeChannel = 'meal' | 'observation' | 'eval' | 'time';

/** One event logged on a day, nested inside its day node as evidence (#519). */
export type JourneyEvent =
  | { channel: 'meal'; date: string; meal: Meal }
  | { channel: 'observation'; date: string; observation: SkinObservation }
  | { channel: 'eval'; date: string; evaluation: ReintroductionEvaluation };

/** One-line evidence label for an event nested in a day box (icon + summary). */
export function eventLine(event: JourneyEvent): string {
  if (event.channel === 'meal') {
    const item = event.meal.items[0];
    return `🍽 ${item ? item.name : 'dose'}`;
  }
  if (event.channel === 'observation') {
    const max = event.observation.regions.reduce((m, r) => Math.max(m, r.level), 0);
    return `🩹 skin ${max}`;
  }
  return `📋 ${event.evaluation.outcome}`;
}

/**
 * One collapsed box on the day-spine: a run of consecutive days that resolved to
 * the same situation, with the events logged across those days nested inside as
 * ordered evidence, and the last day's full engine trace for drill-in.
 */
export type JourneyDay = {
  kind: JourneyNodeKind;
  fromDate: string;
  toDate: string;
  events: JourneyEvent[];
  /** The engine trace of the last day in this box; `null` for `not-started`. */
  explain: LadderExplain | null;
  /** The channel that opened this box (what changed from the previous box). */
  enteredVia: JourneyEdgeChannel | null;
};

/** Events logged on exactly `date`, in channel order (meal, observation, eval). */
function eventsOn(events: RunEvents, date: string): JourneyEvent[] {
  const out: JourneyEvent[] = [];
  for (const meal of events.meals)
    if (meal.date === date) out.push({ channel: 'meal', date, meal });
  for (const observation of events.observations)
    if (observation.date === date) out.push({ channel: 'observation', date, observation });
  for (const evaluation of events.evaluations)
    if (evaluation.date === date) out.push({ channel: 'eval', date, evaluation });
  return out;
}

/**
 * Replay a run day-by-day through the real `explainLadderMove` seam and collapse
 * it into a day-spine of situations (#519, #530). Each day clips the event
 * streams to `date <= today` (the engine reads whole history, so future events
 * must be withheld) and resolves to exactly one box; consecutive identical boxes
 * collapse into one node, and the events logged across a box's span nest inside
 * it. A synthetic `not-started` entry node is prepended — the engine only speaks
 * once there is history, so the graph's entry point is the visualizer's, not the
 * engine's. The edge into each box carries the channel that changed the box.
 */
export function replayJourney(run: JourneyRun): JourneyDay[] {
  const days: JourneyDay[] = [
    {
      kind: 'not-started',
      fromDate: run.days[0] ?? '',
      toDate: run.days[0] ?? '',
      events: [],
      explain: null,
      enteredVia: null,
    },
  ];

  for (const today of run.days) {
    const explain = explainLadderMove({
      allergenId: run.allergenId,
      meals: run.events.meals.filter((m) => m.date <= today),
      evaluations: run.events.evaluations.filter((e) => e.date <= today),
      observations: run.events.observations.filter((o) => o.date <= today),
      defaultLadder: run.defaultLadder,
      stage: run.stage,
      today,
      cadenceDays: run.cadenceDays,
      stabilityWindowDays: run.stabilityWindowDays,
    });
    const kind = journeyNodeKind(explain.decision);
    const dayEvents = eventsOn(run.events, today);

    const last = days[days.length - 1]!;
    if (last.kind === kind && last.kind !== 'not-started') {
      last.toDate = today;
      last.explain = explain;
      last.events.push(...dayEvents);
    } else {
      days.push({
        kind,
        fromDate: today,
        toDate: today,
        events: dayEvents,
        explain,
        enteredVia: dominantChannel(dayEvents),
      });
    }
  }

  return days;
}

/**
 * The channel that opened a box: whichever event was logged the day the box
 * changed, in precedence order (eval > observation > meal — a verdict is the
 * strongest signal), or `time` when the box turned over with no event that day
 * (a cadence window elapsing, a rest expiring, a dwell settling — all `today`
 * advancing, #519). This is deliberately the coarse 4-channel label, not a
 * fine-grained "why" — that is owned by the explain seam captured in `explain`,
 * so this never re-derives the engine's reasoning (#519).
 */
function dominantChannel(dayEvents: JourneyEvent[]): JourneyEdgeChannel {
  if (dayEvents.some((e) => e.channel === 'eval')) return 'eval';
  if (dayEvents.some((e) => e.channel === 'observation')) return 'observation';
  if (dayEvents.some((e) => e.channel === 'meal')) return 'meal';
  return 'time';
}
