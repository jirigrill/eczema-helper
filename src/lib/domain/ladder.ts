import type {
  Meal,
  PortionKind,
  LadderAllergenId,
  SkinObservation,
  RegionLevel,
  ReintroductionEvaluation,
  AllergenOutcome
} from '$lib/domain/models';
import { overallSeverity } from '$lib/domain/models';
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import {
  REST_PHASE_DAYS_MILD,
  REST_PHASE_DAYS_CLEAR,
  REST_PHASE_DAYS_SEVERE,
  MAX_RUNG_REACTIONS
} from '$lib/domain/policy';
import { addDays } from '$lib/utils/date';

export type { FeedingStage, Ladder, LadderStep };

function foodTriggers(foodId: string): readonly string[] {
  const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find(
    (f) => f.id === foodId
  );
  if (food) return food.allergenIds;
  if (foodId.startsWith('other:')) return [foodId.slice(6)];
  return [];
}

function mealHitsAllergen(meal: Meal, allergenId: LadderAllergenId): boolean {
  return meal.items.some((i) => foodTriggers(i.foodId).includes(allergenId));
}

/**
 * Return the ladder in effect for an allergen: the default merged with the
 * override at stage granularity. When the override defines rungs for a stage,
 * those replace the default's rungs for that stage; stages the override does
 * not touch keep the default (issue #427, ADR-0023). A missing/undefined
 * override returns the default identity.
 *
 * Stage-level merge matters because `Ladder.stages` is `Partial<Record<...>>`:
 * a clinician who customizes only `breastfed` must not silently erase
 * `mixed`/`solids` when the child transitions stages.
 *
 * Included in the ADR-0002 export so a device restore preserves the plan.
 */
export function resolveLadder(
  defaultLadder: Ladder,
  override: Ladder | null | undefined
): Ladder {
  if (!override) return defaultLadder;
  return {
    ...defaultLadder,
    ...override,
    stages: { ...defaultLadder.stages, ...override.stages },
  };
}

/** Rest length keyed to reaction severity (ADR-0016). */
function restDaysFor(outcome: AllergenOutcome): number {
  return outcome === 'mild-reaction'
    ? REST_PHASE_DAYS_MILD
    : outcome === 'clear-reaction'
      ? REST_PHASE_DAYS_CLEAR
      : REST_PHASE_DAYS_SEVERE;
}

/** A reaction still in effect: the rung that reacted and how recovery unwinds. */
type PendingReaction = {
  /** The rung the reaction bound to (highest live rung dosed on or before the verdict). */
  rung: LadderStep;
  outcome: AllergenOutcome;
  /** ISO date the reaction verdict was recorded. */
  date: string;
  /** ISO date the rest window ends — `date + restDaysFor(outcome)` (ADR-0016). */
  until: string;
  /** Last-passing rung to step back to and re-test — the rung directly below `rung`. */
  stepBackTo: LadderStep;
};

/**
 * The four facts the ladder decision engine needs, produced by one date-ordered
 * replay of meals + evaluations (PRD #445). Private — surfaced only through
 * `currentRung` (which projects `liveRung`) and `decideLadderMove`.
 */
type LadderReplayState = {
  /** Highest rung logged and not reacted-against (reaction-aware `currentRung`). */
  liveRung: LadderStep | null;
  /** Rung to retreat to when a reaction's rest elapses; `liveRung` when none pending. */
  lastPassingRung: LadderStep | null;
  /** The reaction still in effect (rest/step-back), or `null` once cleared by a clean verdict. */
  pendingReaction: PendingReaction | null;
  /** A rung confirmed as a ceiling — per-rung cap hit or floor exhausted. Terminal. */
  ceilingRung: LadderStep | null;
  /** How many times each rung (by id) has reacted across the whole history. */
  reactionCounts: ReadonlyMap<string, number>;
};

type ReplayEvent =
  | { date: string; order: 0; kind: 'anchor'; amount: PortionKind }
  | { date: string; order: 1; kind: 'eval'; outcome: AllergenOutcome };

/**
 * Replay `meals` + `evaluations` for one allergen against the effective `steps`
 * once, in date order, and produce the derived ladder state (PRD #445).
 *
 * The climb is anchor-driven exactly as the original `currentRung` walk: a meal
 * whose item anchors the next step advances the live rung. A reaction verdict
 * dated D binds to the highest still-live rung whose anchor was logged in a meal
 * on or before D (meals sort before same-date evaluations), drops the live rung
 * one step, and opens that rung for a re-test — so a reaction is a *temporary*
 * setback: a later clean re-dose re-advances, and a `tolerated` verdict clears
 * the pending reaction entirely. A reaction on the lowest rung (nowhere lower to
 * retreat) or the `MAX_RUNG_REACTIONS`-th reaction on one rung is a confirmed
 * ceiling — a single unified terminal that defers to human care (ADR-0023,
 * ADR-0024); the engine never sets a `permanent-*` status itself (ADR-0012).
 *
 * Written exactly once so `currentRung` and `decideLadderMove` cannot drift on
 * how a reaction moves the rung. Never exported.
 */
function deriveLadderState(
  allergenId: LadderAllergenId,
  meals: Meal[],
  evaluations: readonly ReintroductionEvaluation[],
  steps: readonly LadderStep[]
): LadderReplayState {
  // Build one chronological event stream. Meal anchors (climb) carry `order: 0`
  // and evaluations (verdicts) carry `order: 1`, so a same-day dose is replayed
  // before that day's verdict and the reaction binds to the rung it reached.
  const events: ReplayEvent[] = [];
  const orderedMeals = [...meals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const meal of orderedMeals) {
    if (!mealHitsAllergen(meal, allergenId)) continue;
    for (const item of meal.items) {
      if (foodTriggers(item.foodId).includes(allergenId)) {
        events.push({ date: meal.date, order: 0, kind: 'anchor', amount: item.amount });
      }
    }
  }
  for (const e of evaluations) {
    if (e.phaseType !== 'allergen-test' || e.allergenId !== allergenId) continue;
    events.push({ date: e.date, order: 1, kind: 'eval', outcome: e.outcome as AllergenOutcome });
  }
  // Stable sort (ES2019+): same date/order events keep insertion order, so meal
  // anchors stay in `createdAt` sequence within a day.
  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

  let liveIndex = -1; // highest step reached
  let nextStepIdx = 0; // next step the climb is trying to reach
  let pendingReaction: PendingReaction | null = null;
  let ceilingRung: LadderStep | null = null;
  const reactionCounts = new Map<string, number>();

  for (const ev of events) {
    if (ceilingRung) break; // terminal — nothing that follows can move the ladder

    if (ev.kind === 'anchor') {
      if (nextStepIdx < steps.length && steps[nextStepIdx].anchor === ev.amount) {
        liveIndex = nextStepIdx;
        nextStepIdx += 1;
      }
      continue;
    }

    if (ev.outcome === 'tolerated') {
      pendingReaction = null; // a clean verdict resolves any prior setback
      continue;
    }

    // Reaction — bind to the highest still-live rung (nothing dosed yet ⇒ nothing
    // to bind to).
    if (liveIndex < 0) continue;
    const reactingRung = steps[liveIndex];
    const count = (reactionCounts.get(reactingRung.id) ?? 0) + 1;
    reactionCounts.set(reactingRung.id, count);

    if (liveIndex === 0 || count >= MAX_RUNG_REACTIONS) {
      // Floor exhaustion (nowhere lower) or the per-rung cap — the same terminal.
      ceilingRung = reactingRung;
      pendingReaction = null;
      break;
    }

    pendingReaction = {
      rung: reactingRung,
      outcome: ev.outcome,
      date: ev.date,
      until: addDays(ev.date, restDaysFor(ev.outcome)),
      stepBackTo: steps[liveIndex - 1]
    };
    // Drop one rung and reopen the reacting rung for a re-test.
    liveIndex -= 1;
    nextStepIdx = liveIndex + 1;
  }

  const liveRung = liveIndex >= 0 ? steps[liveIndex] : null;
  return {
    liveRung,
    lastPassingRung: pendingReaction?.stepBackTo ?? liveRung,
    pendingReaction,
    ceilingRung,
    reactionCounts
  };
}

/**
 * Highest ladder rung whose anchor has been logged and not reacted-against,
 * for the given `stage` on the effective ladder (default merged with any
 * override — see `resolveLadder`). Derived from meal history — never
 * persisted (ADR-0012).
 *
 * `evaluations` (optional) is the mother's `ReintroductionEvaluation` history.
 * A recorded reaction (an `allergen-test` row for `allergenId` whose outcome is
 * not `tolerated`) *caps* the rung: the reacting dose drops the live rung one
 * step, so a dose that provoked a reaction never leaves the ladder standing on
 * it. This is the "not reacted-against" half of the rule — the ladder tracks
 * safely-tolerated reality, not everything ingested (Story 7). A reaction is a
 * *temporary* setback: a later clean re-dose re-advances. Omit `evaluations`
 * (or pass none) and every logged anchor counts.
 *
 * Projects `liveRung` from the shared `deriveLadderState` replay (PRD #445) so
 * it and `decideLadderMove` share one definition of how a reaction moves the
 * rung.
 *
 * Returns `null` when the mother has not yet logged the first step of the
 * effective ladder for `stage`, or when the effective ladder has no rungs
 * defined for `stage`.
 */
export function currentRung(
  allergenId: LadderAllergenId,
  meals: Meal[],
  defaultLadder: Ladder,
  stage: FeedingStage,
  override?: Ladder | null,
  evaluations?: readonly ReintroductionEvaluation[]
): LadderStep | null {
  const steps = resolveLadder(defaultLadder, override).stages[stage] ?? [];
  return deriveLadderState(allergenId, meals, evaluations ?? [], steps).liveRung;
}

/**
 * The single next legal step above `rung` on the effective ladder's `stage`,
 * or `null` at the top. Passing `null` for `rung` returns the first step.
 * Advancing more than one step is impossible to express — the function
 * returns a step or nothing.
 *
 * `opts.isPermanentlyEliminated` — when true (allergen is `permanent-mother`
 * or `permanent-baby` per ADR-0012), the ladder is inert: return `null`
 * regardless of the current rung. The permanent-elimination refusal is
 * absolute; no other gate can override it.
 */
export function nextLegalStep(
  rung: LadderStep | null,
  defaultLadder: Ladder,
  stage: FeedingStage,
  override?: Ladder | null,
  opts?: { isPermanentlyEliminated?: boolean }
): LadderStep | null {
  if (opts?.isPermanentlyEliminated) return null;
  const steps = resolveLadder(defaultLadder, override).stages[stage] ?? [];
  if (rung === null) return steps[0] ?? null;
  const idx = steps.findIndex((s) => s.id === rung.id);
  if (idx === -1) return null;
  return steps[idx + 1] ?? null;
}

// ── Gates ─────────────────────────────────────────────────────

/**
 * Rung at position `dayInPhase` (1-indexed) on the allergen's `stage` ladder,
 * or `null` if the allergen carries no ladder for that stage or the day is
 * out of range. Hides the four-hop walk `catalog → allergen → ladder →
 * stages[stage] → [i]` from templates and callers; the meal page and the
 * ladder-driven fields on `ReintroductionDayInfo` share this single walk.
 */
export function rungAtDayInPhase(
  catalog: CanonicalCatalogPort,
  allergenId: LadderAllergenId,
  dayInPhase: number,
  stage: FeedingStage
): LadderStep | null {
  const steps = catalog.get(allergenId)?.ladder?.stages[stage];
  if (!steps) return null;
  return steps[dayInPhase - 1] ?? null;
}

export type CadenceGateResult = {
  /** Whether the cadence threshold has elapsed since the last matching dose. */
  allowed: boolean;
  /**
   * Integer days between the most recent matching meal date and `today`.
   * `null` when the allergen has never been dosed — in that case the gate
   * imposes no delay (there is nothing to wait for).
   */
  daysSinceLastDose: number | null;
};

function daysSince(fromIsoDate: string, toIsoDate: string): number {
  return Math.round(
    (new Date(toIsoDate + 'T00:00:00').getTime() - new Date(fromIsoDate + 'T00:00:00').getTime()) / 86400000
  );
}

/**
 * Cadence gate — whether enough days have elapsed since the last dose of
 * `allergenId` for escalation to be legal on `today`. Pure over the meal
 * history; `cadenceDays` is the minimum spacing to enforce, sourced by the
 * caller from the phase/protocol context (F3 accepted-allergen growth and
 * F4 active reintroduction use different rhythms — see ADR-0023).
 */
export function cadenceGate(
  allergenId: LadderAllergenId,
  meals: Meal[],
  today: string,
  cadenceDays: number
): CadenceGateResult {
  const matching = meals.filter((m) => mealHitsAllergen(m, allergenId));
  if (matching.length === 0) return { allowed: true, daysSinceLastDose: null };

  const lastDate = matching.map((m) => m.date).sort().at(-1) as string;
  const elapsed = daysSince(lastDate, today);
  return { allowed: elapsed >= cadenceDays, daysSinceLastDose: elapsed };
}

export type SkinCalmGateResult = {
  /** Whether escalation is allowed — false while the baby is currently flaring. */
  allowed: boolean;
  /** True when the latest observation on or before `today` shows any active region. */
  isFlare: boolean;
  /** Day-overall severity of the most recent observation, or `null` when none exists. */
  latestSeverity: RegionLevel | null;
};

/**
 * Skin-calm gate — holds escalation while the baby is currently flaring.
 * A flare is defined as `overallSeverity > 0` on the most recent observation
 * on or before `today`. With no observation the gate is permissive (nothing
 * to hold against); consumers that require positive confirmation of calm
 * should combine this with a "did the mother log skin today?" check.
 */
export function skinCalmGate(
  observations: SkinObservation[],
  today: string
): SkinCalmGateResult {
  const eligible = observations.filter((o) => o.date <= today);
  if (eligible.length === 0) return { allowed: true, isFlare: false, latestSeverity: null };

  eligible.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });
  const latest = eligible[eligible.length - 1];
  const severity = overallSeverity(latest);
  return { allowed: severity === 0, isFlare: severity > 0, latestSeverity: severity };
}

export type SkinStabilityGateResult = {
  /** Whether escalation is allowed — false when skin severity has increased across the window. */
  allowed: boolean;
  /** Severity to compare against — first observation inside the window if any,
   *  otherwise the most recent observation before it, otherwise `null`. */
  baselineSeverity: RegionLevel | null;
  /** Severity on the most recent observation on or before `today`, or `null` when none exists. */
  currentSeverity: RegionLevel | null;
};

/**
 * Skin-stability gate — the trend-based successor to `skinCalmGate` inside the
 * decision engine (ADR-0023 §decision-engine). Blocks escalation when skin has
 * *worsened* across the window; a steady baseline of mild eczema is not a hold
 * reason. Baseline priority: first observation inside `[today - windowDays, today]`
 * if any exists (start-of-window reading), otherwise the most recent observation
 * before the window (a stale-but-known baseline). With no observations at all
 * the gate is permissive — same "missing data ≠ hold" stance as the other gates.
 * Under an unchanged or improved reading the mother's silence is read as
 * "unchanged," matching how a diligent logger would report a stable child.
 * `windowDays` is injected by the caller so the engine never derives it.
 */
export function skinStabilityGate(
  observations: SkinObservation[],
  today: string,
  windowDays: number
): SkinStabilityGateResult {
  const eligible = observations
    .filter((o) => o.date <= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
  if (eligible.length === 0) {
    return { allowed: true, baselineSeverity: null, currentSeverity: null };
  }

  const windowStart = addDays(today, -windowDays);
  const inWindow = eligible.filter((o) => o.date >= windowStart);
  const beforeWindow = eligible.filter((o) => o.date < windowStart);
  const baselineObs =
    inWindow.length > 0 ? inWindow[0] : beforeWindow[beforeWindow.length - 1];
  const currentObs = eligible[eligible.length - 1];

  const baselineSeverity = overallSeverity(baselineObs);
  const currentSeverity = overallSeverity(currentObs);
  return {
    allowed: currentSeverity <= baselineSeverity,
    baselineSeverity,
    currentSeverity
  };
}

export type CheckpointVerdictGateResult = {
  /** Whether escalation past the checkpoint rung is allowed. */
  allowed: boolean;
  /** True when a reaction verdict was recorded and a rest phase should follow. */
  requiresRest: boolean;
  /** Rest length keyed to reaction severity (ADR-0016), or `null` when no rest is due. */
  restDays: number | null;
};

/**
 * Checkpoint-verdict gate — the phase-level evaluation, distinct from the
 * day-to-day `skinCalmGate`. Holds escalation at an `isEvaluationCheckpoint`
 * rung until a verdict is recorded for `allergenId`; permissive at any
 * non-checkpoint rung (nothing to evaluate there).
 *
 * Unlike `skinCalmGate`, an unrecorded verdict blocks — a checkpoint is a
 * deliberate decision point, not a background signal to default open on.
 *
 * `evaluations` is the mother's full `ReintroductionEvaluation` history;
 * filtered here to `allergen-test` rows for `allergenId` and reduced to the
 * latest by date — mirrors the "latest wins" rule `allergen-status.ts` uses
 * for reintroduction phases (ADR-0012). No new storage: this reuses the same
 * append-only evaluation log F4 already wrote one row per evaluation day into.
 */
export function checkpointVerdictGate(
  rung: LadderStep | null,
  allergenId: LadderAllergenId,
  evaluations: readonly ReintroductionEvaluation[]
): CheckpointVerdictGateResult {
  if (rung === null || !rung.isEvaluationCheckpoint) {
    return { allowed: true, requiresRest: false, restDays: null };
  }

  const matching = evaluations.filter(
    (e) => e.phaseType === 'allergen-test' && e.allergenId === allergenId
  );
  if (matching.length === 0) return { allowed: false, requiresRest: false, restDays: null };

  const latest = [...matching].sort((a, b) => a.date.localeCompare(b.date)).at(-1) as ReintroductionEvaluation;
  const outcome = latest.outcome as AllergenOutcome;
  if (outcome === 'tolerated') return { allowed: true, requiresRest: false, restDays: null };

  return { allowed: false, requiresRest: true, restDays: restDaysFor(outcome) };
}

// ── Decision engine ───────────────────────────────────────────

/**
 * One per-allergen verdict for one moment — the closed vocabulary the F3 ≡ F4
 * walker returns (PRD #445, ADR-0023 §decision-engine). `advance` with
 * `from: null` is the first move (no separate `start`); `advance` and
 * `step-back` are distinct kinds because direction and reason differ. `rest`
 * carries `until` so "re-test becomes due" is computable without re-adding
 * `days` to `today`. `blocked` carries no rung — the ladder was inert from the
 * start; `ceiling-reached` carries the rung it got stuck at.
 */
export type LadderDecision =
  | { kind: 'advance'; from: LadderStep | null; to: LadderStep }
  | {
      kind: 'hold';
      rung: LadderStep;
      reason: 'awaiting-verdict' | 'skin-worsening' | 'cadence';
      /** Only set when reason is 'cadence' — days left before the cadence gate re-opens. */
      daysRemaining?: number;
      /** Only set when reason is 'skin-worsening' — the baseline the current reading rose above. */
      baselineSeverity?: RegionLevel;
      /** Only set when reason is 'skin-worsening' — the current severity that triggered the hold. */
      currentSeverity?: RegionLevel;
    }
  | { kind: 'rest'; rung: LadderStep; days: number; until: string }
  | { kind: 'step-back'; from: LadderStep; to: LadderStep }
  | { kind: 'passed'; rung: LadderStep }
  | { kind: 'blocked' }
  | { kind: 'ceiling-reached'; rung: LadderStep };

/**
 * Single-object input to `decideLadderMove` — raw history plus the ladder
 * context for one allergen, one feeding stage, one day. The engine calls the
 * gates itself, so the precedence lives in one place, not smeared across
 * callers. `cadenceDays` is injected by the caller (F3 vs F4 rhythm — see
 * `cadenceForPhase` in `policy.ts`); the engine never derives it. It reads no
 * schedule topology and no `AllergenStatus`.
 */
export type LadderDecisionInput = {
  allergenId: LadderAllergenId;
  meals: Meal[];
  evaluations: readonly ReintroductionEvaluation[];
  observations: SkinObservation[];
  defaultLadder: Ladder;
  override?: Ladder | null;
  stage: FeedingStage;
  today: string;
  /** Minimum spacing between escalation steps (F3/F4 via `cadenceForPhase`). */
  cadenceDays: number;
  /** Look-back window for the skin-stability gate — how many days back to seek a baseline. */
  stabilityWindowDays: number;
  /** True for a `permanent-mother`/`permanent-baby` allergen (ADR-0012). */
  isPermanentlyEliminated?: boolean;
};

/**
 * The deterministic ladder "brain" (PRD #445): compose `currentRung`, the three
 * gates, and the shared reaction replay into one `LadderDecision` for one
 * allergen at one moment. The F3 ≡ F4 walker — it never branches on phase; the
 * phase difference reduces to the injected `cadenceDays`. It decides but never
 * writes (no meal, evaluation, or schedule mutation); the mother still logs
 * every dose herself.
 *
 * Gate precedence, most-overriding first (ADR-0023 §decision-engine):
 *   1. permanent elimination → `blocked` (also an empty stage ladder — inert);
 *   2. floor exhausted or per-rung cap hit → `ceiling-reached` (unified terminal);
 *   3. reaction still in effect → `rest` (rest window open) then `step-back`;
 *   4. checkpoint awaiting a verdict → `hold('awaiting-verdict')`;
 *   5. skin worsened across the stability window → `hold('skin-worsening')`;
 *   6. cadence not elapsed → `hold('cadence', daysRemaining)`;
 *   7. otherwise → `advance`, or `passed` at the effective top.
 *
 * Safety/clinical gates dominate rhythm gates: a recorded reaction outranks an
 * awaiting-verdict hold, and skin state outranks cadence (never advance while
 * skin is trending worse, even when the clock allows it). A steady baseline
 * — even mild eczema at severity 1 — is not a hold reason on its own; only an
 * increase over the window's baseline blocks. All rung reasoning runs against
 * the *effective* ladder (`resolveLadder`), never the raw default.
 */
export function decideLadderMove(input: LadderDecisionInput): LadderDecision {
  const { allergenId, meals, evaluations, observations, defaultLadder, override, stage, today } =
    input;

  // (1) Permanent elimination — the ladder is inert regardless of history.
  if (input.isPermanentlyEliminated) return { kind: 'blocked' };

  const steps = resolveLadder(defaultLadder, override).stages[stage] ?? [];
  // No rungs for this stage: nothing to walk — the same rung-less "inert"
  // verdict as a permanently-eliminated allergen.
  if (steps.length === 0) return { kind: 'blocked' };

  const state = deriveLadderState(allergenId, meals, evaluations, steps);

  // (2) Ceiling — per-rung cap or floor exhaustion. Terminal; defers to human.
  if (state.ceilingRung) return { kind: 'ceiling-reached', rung: state.ceilingRung };

  // (3) A reaction still in effect: rest while the recovery window is open, then
  //     step back to the last-passing rung to re-test.
  if (state.pendingReaction) {
    const { rung, outcome, until, stepBackTo } = state.pendingReaction;
    if (today <= until) return { kind: 'rest', rung, days: restDaysFor(outcome), until };
    return { kind: 'step-back', from: rung, to: stepBackTo };
  }

  const liveRung = state.liveRung;

  // (4) A checkpoint awaiting a verdict is a deliberate decision point — hold.
  //     (A recorded reaction would have been caught at (3), so `requiresRest`
  //     here only guards against misreading a rest as an awaiting-verdict.)
  const verdict = checkpointVerdictGate(liveRung, allergenId, evaluations);
  if (!verdict.allowed && !verdict.requiresRest) {
    return { kind: 'hold', rung: liveRung as LadderStep, reason: 'awaiting-verdict' };
  }

  // Rung the remaining holds refer to: the current rung, or the first step we
  // are about to attempt when nothing has been logged yet.
  const referenceRung = liveRung ?? steps[0];

  // (5) Skin-stability — hold when skin has worsened across the window. A
  //     steady baseline (even mild eczema at severity 1) is not a hold reason;
  //     only an *increase* over the window's baseline blocks escalation.
  const stability = skinStabilityGate(observations, today, input.stabilityWindowDays);
  if (!stability.allowed) {
    return {
      kind: 'hold',
      rung: referenceRung,
      reason: 'skin-worsening',
      baselineSeverity: stability.baselineSeverity as RegionLevel,
      currentSeverity: stability.currentSeverity as RegionLevel
    };
  }

  // (6) Cadence — wait the required spacing since the last dose.
  const cadence = cadenceGate(allergenId, meals, today, input.cadenceDays);
  if (!cadence.allowed) {
    return {
      kind: 'hold',
      rung: referenceRung,
      reason: 'cadence',
      daysRemaining: Math.max(0, input.cadenceDays - (cadence.daysSinceLastDose ?? 0))
    };
  }

  // (7) Escalate one legal step, or report the whole ladder passed at the top.
  // `isPermanentlyEliminated` is already handled at (1); pass it through anyway so
  // this stays consistent with `nextLegalStep`'s own permanent-elimination contract.
  const nextStep = nextLegalStep(liveRung, defaultLadder, stage, override, {
    isPermanentlyEliminated: input.isPermanentlyEliminated
  });
  if (nextStep === null) return { kind: 'passed', rung: liveRung as LadderStep };
  return { kind: 'advance', from: liveRung, to: nextStep };
}

