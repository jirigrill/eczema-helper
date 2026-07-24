import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import type { Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  FeedingStage,
  LadderAllergenId,
  Meal,
  PortionKind,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { overallSeverity } from '$lib/domain/models';
import {
  REACTION_LATENCY_DAYS,
  REST_PHASE_DAYS_CLEAR,
  REST_PHASE_DAYS_MILD,
  REST_PHASE_DAYS_SEVERE,
  effectiveCadenceDays,
} from '$lib/domain/policy';
import type { LadderMode } from '$lib/domain/policy';
import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import { addDays } from '$lib/utils/date';

export type { FeedingStage, Ladder, LadderStep };

function foodTriggers(foodId: string): readonly string[] {
  const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find(
    (f) => f.id === foodId,
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
export function resolveLadder(defaultLadder: Ladder, override: Ladder | null | undefined): Ladder {
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

/** A reaction still resting: the stepped-down rung and when its recovery ends. */
export type PendingRest = {
  /** The rung the ladder stepped **down** to after the reaction (the reacting rung − 1). */
  rung: LadderStep;
  outcome: AllergenOutcome;
  /** ISO date the reaction verdict was recorded. */
  date: string;
  /** ISO date the rest window ends — `date + restDaysFor(outcome)` (ADR-0016). */
  until: string;
};

/**
 * The four facts the ladder decision engine needs, produced by one date-ordered
 * replay of meals + evaluations (PRD #445). Private — surfaced only through
 * `currentRung` (which projects `liveRung`) and `decideLadderMove`.
 */
type LadderReplayState = {
  /** Highest rung logged and not reacted-against (reaction-aware `currentRung`). */
  liveRung: LadderStep | null;
  /**
   * Whether the live rung is at the effective top — the highest rung the climb
   * may still reach, which starts at the structural top and drops one rung per
   * confirmed reaction (the walk-down cap). At the effective top the engine
   * dwells rather than advancing; below it the engine climbs.
   */
  atEffectiveTop: boolean;
  /** A reaction still resting (walk-down recovery window), or `null` when none is open. */
  pendingRest: PendingRest | null;
  /** A rung confirmed as a terminal ceiling — floor exhausted. Terminal. */
  ceilingRung: LadderStep | null;
  /**
   * Probe/confirm mode, derived — never persisted (ADR-0023 §6, PRD #454).
   * `probe` before the first reaction; `confirm` once a reaction has been seen
   * *or* the climb has reached the top rung (a clean probe confirms the top).
   */
  mode: LadderMode;
  /**
   * Effective-top dwell progress — the two facts the `settled` terminal needs,
   * always derived and reset together (see `Dwell`). Once the climb reaches the
   * effective top, every further dose of that rung's anchor advances the dwell;
   * a reaction restarts it. A clean probe confirms the *top rung only*, so only
   * the effective top dwells (dose–response is monotone); lower rungs are
   * advanced through.
   */
  dwell: Dwell;
};

/**
 * Effective-top dwell state — how many times the effective top rung has been
 * dosed and the date of the last such dose, for the `last dose + latency` →
 * `settled` terminal (ADR-0023 §6, PRD #454). The two fields always move
 * together: both advance on an effective-top dose and both reset on a reaction
 * (`NO_DWELL`), so a dose straddling a reaction can never complete a dwell.
 */
export type Dwell = {
  /** Doses landed on the effective top rung so far. */
  count: number;
  /** ISO date of the most recent effective-top dose, or `null` before the top is reached. */
  lastDoseDate: string | null;
};

/** The empty dwell — no effective-top dose counted yet. Also the reaction reset. */
const NO_DWELL: Dwell = { count: 0, lastDoseDate: null };

type ReplayEvent =
  | { date: string; order: 0; kind: 'anchor'; amount: PortionKind }
  | { date: string; order: 1; kind: 'eval'; outcome: AllergenOutcome };

/**
 * Replay `meals` + `evaluations` for one allergen against the effective `steps`
 * once, in date order, and produce the derived ladder state (PRD #445).
 *
 * The climb is anchor-driven exactly as the original `currentRung` walk: a meal
 * whose item anchors the next step advances the live rung. A reaction verdict
 * dated D binds to the highest still-live rung — the highest rung dosed on or
 * before D (meals sort before same-date evaluations, so a same-day dose counts).
 * Under confirm cadence ≥ latency that rung is also the single rung inside the
 * `[D − latency, D]` attribution window; the probe (cadence 1) binds coarsely to
 * the same top rung, corrected later by the downward confirm walk. The reaction
 * **walks the ladder down one rung** and caps the reacting rung forever — it is
 * *never re-climbed* (ADR-0023 §6, PRD #454). The stepped-down rung must be
 * re-confirmed by its own dwell before it settles; a single earlier climb-past
 * exposure does not count. A `tolerated` verdict only clears the recovery rest
 * window. A reaction on the lowest rung (nowhere lower to retreat) is a confirmed
 * ceiling that defers to human care (ADR-0023, ADR-0024); the engine never sets
 * a `permanent-*` status itself (ADR-0012).
 *
 * It also derives the probe/confirm **mode** and the effective-top **dwell**
 * count (ADR-0023 §6, PRD #454) purely from the same replay — no persisted flag:
 * the mode is `confirm` once any reaction has been seen or the climb has reached
 * the effective top, `probe` otherwise; the dwell count is how many times the
 * effective top rung's anchor has been dosed since it became the top.
 * `decideLadderMove` turns those into cadence and the `settled` terminal.
 *
 * Written exactly once so `currentRung` and `decideLadderMove` cannot drift on
 * how a reaction moves the rung. Never exported. When a `trace` sink is passed
 * (visualizer-only), the loop records one `LadderReplayStep` per event and the
 * initial frame — the single loop stays the one implementation (no parallel
 * traced replay); the production decision path pays only the `if (trace)` guards.
 */
function deriveLadderState(
  allergenId: LadderAllergenId,
  meals: Meal[],
  evaluations: readonly ReintroductionEvaluation[],
  steps: readonly LadderStep[],
  /**
   * Optional trace sink (visualizer-only). When provided, the loop appends one
   * `LadderReplayStep` per event and sets `.initial` — the single loop stays the
   * one implementation (no parallel traced replay). Omitted on the production
   * decision path, which pays nothing beyond the `if (trace)` guards.
   */
  trace?: { initial?: LadderReplayFrame; steps: LadderReplayStep[] },
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
  let pendingRest: PendingRest | null = null;
  let ceilingRung: LadderStep | null = null;
  let firstReactionSeen = false;
  let dwell: Dwell = NO_DWELL;
  const topIndex = steps.length - 1;
  // The effective top: highest rung the climb may reach. A confirmed reaction
  // walks it down one rung (never re-climbed); it starts at the structural top.
  let topReachableIndex = topIndex;

  // Capture the loop's evolving variables as an immutable frame — the fields
  // that change per event, so a before/after pair shows what one event did.
  // Only built when tracing.
  const frame = (): LadderReplayFrame => ({
    liveRung: liveIndex >= 0 ? steps[liveIndex]! : null,
    pendingRest,
    ceilingRung,
    dwell,
  });
  if (trace) trace.initial = frame();

  for (const ev of events) {
    if (ceilingRung) break; // terminal — nothing that follows can move the ladder

    const before = trace ? frame() : null;
    // Record one traced step for this event, classified by the branch it took.
    const record = (branch: LadderReplayBranch) => {
      if (!trace) return;
      const event =
        ev.kind === 'anchor'
          ? ({ kind: 'anchor', date: ev.date, amount: ev.amount } as const)
          : ({ kind: 'eval', date: ev.date, outcome: ev.outcome } as const);
      trace.steps.push({ event, branch, before: before!, after: frame() });
    };

    if (ev.kind === 'anchor') {
      // Climb one step — but never past the walk-down ceiling. A dose at the
      // reacting rung's anchor after a reaction cannot re-advance onto it.
      let climbed = false;
      if (
        nextStepIdx <= topReachableIndex &&
        nextStepIdx < steps.length &&
        steps[nextStepIdx]!.anchor === ev.amount
      ) {
        liveIndex = nextStepIdx;
        nextStepIdx += 1;
        climbed = true;
      }
      // Dwell counting: once the climb has reached the *effective* top (the
      // walk-down ceiling, or the structural top when none has walked down),
      // every dose of that rung's anchor is a confirmation dose (the arrival
      // dose is #1, each spaced re-dose thereafter increments). Only the
      // effective top dwells — dose–response is monotone.
      let dwelled = false;
      if (
        liveIndex === topReachableIndex &&
        topReachableIndex >= 0 &&
        ev.amount === steps[topReachableIndex]!.anchor
      ) {
        dwell = { count: dwell.count + 1, lastDoseDate: ev.date };
        dwelled = true;
      }
      // The arrival dose both climbs and increments the dwell; it is recorded as
      // `climb` (the rung move is the salient event) — a later re-dose is `dwell`.
      record(climbed ? 'climb' : dwelled ? 'dwell' : 'anchor-noop');
      continue;
    }

    if (ev.outcome === 'tolerated') {
      pendingRest = null; // a clean verdict resolves any open rest window
      record('tolerated-clear');
      continue;
    }

    // Reaction — bind to the highest still-live rung, i.e. the highest rung
    // dosed on or before the verdict date (`liveIndex` is exactly that, since
    // meals sort before same-date evaluations and the climb is monotone).
    // Under confirm cadence ≥ latency that rung is also the single rung inside
    // the `[D − latency, D]` attribution window; the probe (cadence 1) may hold
    // several rungs in that window and binds coarsely to this same top one,
    // corrected later by the downward confirm walk (ADR-0023 §6).
    if (liveIndex < 0) {
      record('reaction-noop'); // nothing dosed yet ⇒ nothing to bind to
      continue;
    }
    firstReactionSeen = true; // any reaction flips the mode to confirm
    // A reaction interrupts the dwell's "held constant, tolerated" premise, so
    // the confirmation must restart: reset the dwell so `settled` can never be
    // reached by doses that straddle a reaction.
    dwell = NO_DWELL;
    const reactingRung = steps[liveIndex]!;

    if (liveIndex === 0) {
      // Floor exhaustion — the lowest rung reacted, nowhere lower to retreat.
      ceilingRung = reactingRung;
      pendingRest = null;
      record('reaction-ceiling');
      break;
    }

    // Walk down one rung: cap the reacting rung forever and step the live rung
    // down to the rung below, which must now be re-confirmed by its own dwell.
    const steppedDownIndex = liveIndex - 1;
    topReachableIndex = steppedDownIndex;
    liveIndex = steppedDownIndex;
    nextStepIdx = steppedDownIndex + 1; // gated by `topReachableIndex` — cannot re-climb
    pendingRest = {
      rung: steps[steppedDownIndex]!,
      outcome: ev.outcome,
      date: ev.date,
      until: addDays(ev.date, restDaysFor(ev.outcome)),
    };
    record('reaction-walkdown');
  }

  const liveRung = liveIndex >= 0 ? steps[liveIndex]! : null;
  // Mode: `confirm` once a reaction has been seen, or once the climb has reached
  // the effective top (a clean probe confirms the top); `probe` otherwise.
  // Derived, never persisted — recomputed from the same replay every time.
  const mode: LadderMode =
    firstReactionSeen || (topReachableIndex >= 0 && liveIndex === topReachableIndex)
      ? 'confirm'
      : 'probe';
  return {
    liveRung,
    atEffectiveTop: liveIndex >= 0 && liveIndex === topReachableIndex,
    pendingRest,
    ceilingRung,
    mode,
    dwell,
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
 * not `tolerated`) walks the live rung *down* one step and caps the reacting
 * rung forever, so a dose that provoked a reaction never leaves the ladder
 * standing on it and is never re-climbed. This is the "not reacted-against" half
 * of the rule — the ladder tracks safely-tolerated reality, not everything
 * ingested (Story 7). Omit `evaluations` (or pass none) and every logged anchor
 * counts.
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
  evaluations?: readonly ReintroductionEvaluation[],
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
  opts?: { isPermanentlyEliminated?: boolean },
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
  stage: FeedingStage,
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
    (new Date(toIsoDate + 'T00:00:00').getTime() - new Date(fromIsoDate + 'T00:00:00').getTime()) /
      86400000,
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
  cadenceDays: number,
): CadenceGateResult {
  const matching = meals.filter((m) => mealHitsAllergen(m, allergenId));
  if (matching.length === 0) return { allowed: true, daysSinceLastDose: null };

  const lastDate = matching
    .map((m) => m.date)
    .sort()
    .at(-1) as string;
  const elapsed = daysSince(lastDate, today);
  return { allowed: elapsed >= cadenceDays, daysSinceLastDose: elapsed };
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
 * The gate's "missing data ≠ hold" identity: permissive with no severities to
 * compare. Shared by the gate's no-observation return and the trace seed for
 * a walk that fires before it reaches skin-stability — so the two sites can
 * never drift apart.
 */
export const PERMISSIVE_SKIN_STABILITY: SkinStabilityGateResult = Object.freeze({
  allowed: true,
  baselineSeverity: null,
  currentSeverity: null,
});

/**
 * Skin-stability gate — the trend-based skin gate inside the decision engine
 * (ADR-0023 §decision-engine). Blocks escalation when skin has
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
  windowDays: number,
): SkinStabilityGateResult {
  const eligible = observations
    .filter((o) => o.date <= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
  if (eligible.length === 0) {
    return PERMISSIVE_SKIN_STABILITY;
  }

  const windowStart = addDays(today, -windowDays);
  const inWindow = eligible.filter((o) => o.date >= windowStart);
  const beforeWindow = eligible.filter((o) => o.date < windowStart);
  // `eligible` is the disjoint union of `inWindow` and `beforeWindow` and is
  // non-empty here, so at least one branch is populated and the pick is defined.
  const baselineObs = inWindow.length > 0 ? inWindow[0]! : beforeWindow[beforeWindow.length - 1]!;
  const currentObs = eligible[eligible.length - 1]!;

  const baselineSeverity = overallSeverity(baselineObs);
  const currentSeverity = overallSeverity(currentObs);
  return {
    allowed: currentSeverity <= baselineSeverity,
    baselineSeverity,
    currentSeverity,
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
 * day-to-day skin-stability gate. Holds escalation at an `isEvaluationCheckpoint`
 * rung until a verdict is recorded for `allergenId`; permissive at any
 * non-checkpoint rung (nothing to evaluate there).
 *
 * Unlike the skin-stability gate, an unrecorded verdict blocks — a checkpoint is a
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
  evaluations: readonly ReintroductionEvaluation[],
): CheckpointVerdictGateResult {
  if (rung === null || !rung.isEvaluationCheckpoint) {
    return { allowed: true, requiresRest: false, restDays: null };
  }

  const matching = evaluations.filter(
    (e) => e.phaseType === 'allergen-test' && e.allergenId === allergenId,
  );
  if (matching.length === 0) return { allowed: false, requiresRest: false, restDays: null };

  const latest = [...matching]
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1) as ReintroductionEvaluation;
  const outcome = latest.outcome as AllergenOutcome;
  if (outcome === 'tolerated') return { allowed: true, requiresRest: false, restDays: null };

  return { allowed: false, requiresRest: true, restDays: restDaysFor(outcome) };
}

// ── Decision engine ───────────────────────────────────────────

/**
 * One per-allergen verdict for one moment — the closed vocabulary the F3 ≡ F4
 * walker returns (PRD #445, ADR-0023 §decision-engine). `advance` with
 * `from: null` is the first move (no separate `start`). `rest` carries `until`
 * so "recovery ends" is computable without re-adding `days` to `today`.
 * `blocked` carries no rung — the ladder was inert from the start;
 * `ceiling-reached` carries the rung it got stuck at.
 *
 * Clinical-reshape variants (ADR-0023 §6, PRD #454):
 *   - `settled` — a dose confirmed and held at its rung (probe/confirm walk).
 *   - `adapting-decelerate` — the open adaptation window: hold flat, keep
 *     re-dosing, never push through (emitted only while the window is open).
 *     Declared here as a *type only* — `decideLadderMove` does not emit it yet.
 *   - `suspected-reaction` — the detection tripwire: a hold that defers the
 *     "was that flare a reaction?" judgment to the mother, never an auto-ban.
 *     Declared here as a *type only* — not emitted yet.
 *
 * The v1 `step-back` verdict is **retired** with the walk-down reshape (#501):
 * a reaction no longer steps back to re-climb the reacting rung; it walks the
 * ladder *down* and re-confirms the stepped-down rung in place, so there is no
 * distinct "step back to re-test" move left to emit.
 *
 * `ceiling-reached` carries a discriminated `reason` (mirroring how `hold`
 * discriminates on `reason`) so severity survives in the engine output:
 * `'floor-exhaustion'` (lowest rung reacts — nowhere lower to retreat) or
 * `'severe'` (a confirmed severe reaction — the strictly-absorbing terminal,
 * §6). Only `'floor-exhaustion'` is emitted in this slice.
 */
export type LadderDecision =
  | { kind: 'advance'; from: LadderStep | null; to: LadderStep }
  | {
      kind: 'hold';
      rung: LadderStep;
      reason: 'skin-worsening' | 'cadence';
      /** Only set when reason is 'cadence' — days left before the cadence gate re-opens. */
      daysRemaining?: number;
      /** Only set when reason is 'skin-worsening' — the baseline the current reading rose above. */
      baselineSeverity?: RegionLevel;
      /** Only set when reason is 'skin-worsening' — the current severity that triggered the hold. */
      currentSeverity?: RegionLevel;
    }
  | { kind: 'rest'; rung: LadderStep; days: number; until: string }
  | { kind: 'passed'; rung: LadderStep }
  | { kind: 'blocked' }
  | { kind: 'settled'; rung: LadderStep }
  | { kind: 'adapting-decelerate'; rung: LadderStep }
  | { kind: 'suspected-reaction'; rung: LadderStep }
  | { kind: 'ceiling-reached'; rung: LadderStep; reason: 'floor-exhaustion' | 'severe' };

// ── Explain/trace seam (issue #528, design #521) ──────────────

/**
 * A public projection of the `deriveLadderState` replay — the facts a visualizer
 * renders above the precedence trace (design #521, PRD #454). `deriveLadderState`/
 * `LadderReplayState` stay private; this decouples the seam's contract from the
 * replay's internal shape. All fields are always present with explicit `null`s —
 * no field is ever omitted for "nothing to report."
 *
 * Every field is *verdict-facing* — a precedence step reads it. (The walk-down
 * reshape, #501, retired the two former bookkeeping fields `lastPassingRung` and
 * `reactionCounts`: walk-down keeps no per-rung reaction count, and the
 * stepped-down rung *is* the live rung, so neither has a value left to surface.)
 */
export type LadderStateSnapshot = {
  liveRung: LadderStep | null;
  atEffectiveTop: boolean;
  pendingRest: PendingRest | null;
  ceilingRung: LadderStep | null;
  mode: LadderMode;
  dwell: Dwell;
};

/**
 * The state carried on each `LadderReplayStep` — the replay loop's mutable
 * variables captured at one instant (before or after an event). A structural
 * subset of `LadderReplayState`: exactly the fields that *evolve during the
 * loop*, so a before/after pair shows what one event changed. `mode` and
 * `atEffectiveTop` are deliberately absent — both are derived once *after* the
 * loop (never per event), so the ledger sources them from the
 * `LadderStateSnapshot`, not from here.
 */
export type LadderReplayFrame = {
  liveRung: LadderStep | null;
  pendingRest: PendingRest | null;
  ceilingRung: LadderStep | null;
  dwell: Dwell;
};

/**
 * Which branch of the `deriveLadderState` loop one event took. This is the
 * *classification the domain emits* — the ladder-viz adapter maps each value to
 * display prose but never decides the branch itself (no logic in the tool).
 *
 *   - `climb`             — an anchor matched the next step; the live rung rose.
 *   - `dwell`             — an anchor of the top rung's dose; the dwell count rose
 *                           (may co-occur with `climb` on the arrival dose — the
 *                           arrival is recorded as `climb`, later re-doses as `dwell`).
 *   - `anchor-noop`       — an anchor that matched nothing; state unchanged.
 *   - `tolerated-clear`   — a `tolerated` verdict cleared any open rest window.
 *   - `reaction-walkdown` — a reaction walked the live rung down one step and
 *                           capped the reacting rung forever (never re-climbed),
 *                           opening a recovery rest window on the stepped-down rung.
 *   - `reaction-ceiling`  — a reaction on the floor (lowest rung, nowhere lower);
 *                           a terminal ceiling. The loop stops after this event.
 *   - `reaction-noop`     — a reaction before anything was dosed; nothing to bind.
 */
export type LadderReplayBranch =
  | 'climb'
  | 'dwell'
  | 'anchor-noop'
  | 'tolerated-clear'
  | 'reaction-walkdown'
  | 'reaction-ceiling'
  | 'reaction-noop';

/**
 * One replayed event and what the `deriveLadderState` loop did with it: the raw
 * event, the `branch` it took, and the loop state `before`/`after` that event.
 * `explainLadderMove` collects these into `LadderExplain.replay` for the
 * ladder-viz replay ledger. Purely derived and **non-load-bearing** (ADR-0012):
 * no production decision path reads `replay` — it is assembled and attached,
 * never fed back into a verdict.
 *
 * ── MAINTENANCE CONTRACT (read before changing `deriveLadderState`) ──
 * This trace mirrors the *branch structure* of the `deriveLadderState` loop, and
 * nothing else. Therefore:
 *   • Changes to `decideLadderMove`, the gates, precedence order, or the
 *     `LadderDecision` union do **not** touch this type or the ledger — they live
 *     one layer up, over the state this loop produces.
 *   • Only a change to the *loop's branch structure* forces a change here: a new
 *     event kind or a new state transition needs (1) a new `LadderReplayBranch`
 *     value emitted at the new branch in `deriveLadderState`, and (2) a matching
 *     label in `tools/ladder-viz/adapter.ts`. Miss (2) and a row is mislabelled,
 *     never mis-decided.
 *   • A state-changing branch that forgets to emit a step is caught by the
 *     invariant test "last replay step's `after` == the snapshot" — a red test,
 *     not silent drift.
 */
export type LadderReplayStep = {
  event:
    | { kind: 'anchor'; date: string; amount: PortionKind }
    | { kind: 'eval'; date: string; outcome: AllergenOutcome };
  branch: LadderReplayBranch;
  before: LadderReplayFrame;
  after: LadderReplayFrame;
};

/**
 * The whole replay trace: the loop's initial frame (before any event) plus one
 * `LadderReplayStep` per replayed event, in the exact order the loop saw them.
 * The last step's `after` equals the run's `LadderStateSnapshot` (minus `mode`
 * and `atEffectiveTop`, both derived after the loop) by construction — same
 * replay, so the ledger's bottom row *is* the derived state shown above it.
 */
export type LadderReplay = {
  initial: LadderReplayFrame;
  steps: readonly LadderReplayStep[];
};

/**
 * The six precedence steps `decideLadderMove` walks, in order (ADR-0023
 * §decision-engine, §6): the four *structural* steps evaluate a definite fact
 * already known from the replay, and the two *gate-backed* steps
 * (`skin-worsening`, `cadence`) run a gate that can be permissive absent data.
 */
export type LadderPrecedenceStepName =
  | 'permanent-or-empty'
  | 'ceiling'
  | 'reaction'
  | 'skin-worsening'
  | 'cadence'
  | 'advance-or-dwell';

/**
 * How one precedence step resolved: `fired` = produced the verdict; steps after
 * it are `not-reached`; a step that passes without firing is `passed-confirmed`,
 * except the two gate-backed steps which may instead report `passed-no-data`
 * when their gate was permissive only because no data existed to hold against.
 * The four structural steps never report `passed-no-data`.
 */
export type LadderPrecedenceStepStatus =
  | 'not-reached'
  | 'fired'
  | 'passed-confirmed'
  | 'passed-no-data';

/**
 * Per-step payload, discriminated by `step`. Structural steps carry only their
 * name — their evidence is exactly the field already shown in `LadderStateSnapshot`,
 * so a renderer cross-references it there rather than the seam repeating it. The
 * two gate-backed steps carry the gate's own result paired with the *effective*,
 * mode-adjusted threshold the walker fed it (neither gate returns its own
 * threshold), so the trace records the number the decision actually used.
 */
export type LadderPrecedenceStepDetail =
  | { step: 'permanent-or-empty' }
  | { step: 'ceiling' }
  | { step: 'reaction' }
  | { step: 'skin-worsening'; gate: SkinStabilityGateResult; windowDays: number }
  | { step: 'cadence'; gate: CadenceGateResult; cadenceDays: number }
  | { step: 'advance-or-dwell' };

export type LadderPrecedenceStep = {
  name: LadderPrecedenceStepName;
  status: LadderPrecedenceStepStatus;
  detail: LadderPrecedenceStepDetail;
};

/**
 * The fixed 6-tuple of precedence steps in order, so a step can never be
 * silently omitted from a trace. Index maps to `LadderPrecedenceStepName`.
 */
export type LadderPrecedenceSteps = readonly [
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
];

/**
 * The whole trace: the verdict `decideLadderMove` returned (unmodified — the
 * seam synthesizes no prose), the state snapshot, the six precedence steps
 * exactly as walked, and the per-event `replay` of `deriveLadderState`.
 * `explainLadderMove` returns this; `decideLadderMove` returns just `.decision`
 * from the same walk, so the two cannot drift. `replay` is derived and
 * non-load-bearing (ADR-0012) — see `LadderReplayStep`'s maintenance contract.
 */
export type LadderExplain = {
  decision: LadderDecision;
  snapshot: LadderStateSnapshot;
  steps: LadderPrecedenceSteps;
  replay: LadderReplay;
};

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
 * Gate precedence, most-overriding first (ADR-0023 §decision-engine, §6):
 *   1. permanent elimination → `blocked` (also an empty stage ladder — inert);
 *   2. floor exhausted (lowest rung reacts) → `ceiling-reached` (terminal);
 *   3. reaction recovery window open → `rest`; after it the ladder re-confirms
 *      the stepped-down rung in place (walk-down, never re-climb);
 *   4. skin worsened across the stability window → `hold('skin-worsening')`;
 *   5. cadence (mode-driven, `cadence ≥ latency` in confirm) not elapsed →
 *      `hold('cadence', daysRemaining)`;
 *   6. otherwise → `advance`; at the effective top (structural top, or the
 *      walk-down ceiling), `passed` while the dwell confirmation is still
 *      running, then `settled` once it completes.
 *
 * The checkpoint verdict hold (`awaiting-verdict`) is **retired** from this path
 * (ADR-0023 §6, PRD #454): the per-rung verdict it waited on no longer gates the
 * engine. `isEvaluationCheckpoint` survives only as a UI "watch dose — log skin
 * today" nudge; `checkpointVerdictGate` stays exported for that read but the
 * decision path no longer calls it.
 *
 * The probe/confirm **mode** is derived in `deriveLadderState`, never persisted:
 * a first walk probes fast (cadence 1) to find a ceiling; once a reaction is seen
 * or the top rung is reached the engine confirms (cadence ≥ latency). The engine
 * still never branches on F3/F4 phase — only on mode + the injected `cadenceDays`.
 *
 * At the effective top the engine **dwells**: the top rung's dose is held
 * constant and confirmed `N = defaultLadder step count` times at confirm cadence,
 * with terminal evaluation at `last top dose + latency`. `settled` is emitted
 * only once that dwell completes; before then the top reads as `passed` (a clean
 * probe confirms the top rung only — dose–response is monotone).
 *
 * Safety/clinical gates dominate rhythm gates: a recorded reaction outranks skin
 * state, and skin state outranks cadence (never advance while skin is trending
 * worse, even when the clock allows it). A steady baseline — even mild eczema at
 * severity 1 — is not a hold reason on its own; only an increase over the
 * window's baseline blocks. All rung reasoning runs against the *effective*
 * ladder (`resolveLadder`), never the raw default.
 */
export function decideLadderMove(input: LadderDecisionInput): LadderDecision {
  return walkLadderPrecedence(input).decision;
}

/**
 * Explain seam (issue #528, design #521): the whole trace behind one
 * `decideLadderMove` verdict — the decision, a `LadderStateSnapshot`, and the
 * six precedence steps exactly as walked. Runs the *same* `walkLadderPrecedence`
 * the production path does, so the trace can never drift from the decision.
 * Pure and derived (ADR-0012): reruns from the same history are identical.
 */
export function explainLadderMove(input: LadderDecisionInput): LadderExplain {
  return walkLadderPrecedence(input);
}

/**
 * The single implementation of the ladder precedence (ADR-0023
 * §decision-engine, §6). `decideLadderMove` returns its `.decision`;
 * `explainLadderMove` returns the whole thing. The six precedence steps are
 * recorded as the walk executes them — `fired` on the step that produced the
 * verdict, `passed-confirmed`/`passed-no-data` on the steps passed before it,
 * and `not-reached` on every step after it — so the trace and the decision are
 * the same code path by construction. Building the step objects is the only
 * added cost on the production path: no extra gate call, replay, or behavior.
 */
function walkLadderPrecedence(input: LadderDecisionInput): LadderExplain {
  const { allergenId, meals, evaluations, observations, defaultLadder, override, stage, today } =
    input;

  const steps = resolveLadder(defaultLadder, override).stages[stage] ?? [];
  // Derived even when the ladder is inert (permanent / empty stage): the replay
  // is pure and does not change the verdict, but populates a real snapshot for
  // the trace. On an empty stage it returns the all-`null`/`probe` identity.
  // The trace sink collects the per-event replay for `LadderExplain.replay`;
  // `explainLadderMove` and `decideLadderMove` share this one walk, so both the
  // decision and the trace come from the same replay (never a second one).
  const traceSink: { initial?: LadderReplayFrame; steps: LadderReplayStep[] } = { steps: [] };
  const state = deriveLadderState(allergenId, meals, evaluations, steps, traceSink);
  const replay: LadderReplay = {
    // On an empty stage the loop runs zero events; `initial` is still the loop's
    // pre-event frame (all-`null`/empty), never undefined.
    initial: traceSink.initial ?? {
      liveRung: null,
      pendingRest: null,
      ceilingRung: null,
      dwell: NO_DWELL,
    },
    steps: traceSink.steps,
  };
  const snapshot: LadderStateSnapshot = {
    liveRung: state.liveRung,
    atEffectiveTop: state.atEffectiveTop,
    pendingRest: state.pendingRest,
    ceilingRung: state.ceilingRung,
    mode: state.mode,
    dwell: state.dwell,
  };

  // The two gate-backed steps' effective thresholds are known up front (both are
  // pure functions of the input and the derived mode), so a not-reached gate
  // still reports its real threshold, consistently with skin-worsening.
  const cadenceDaysEff = effectiveCadenceDays(state.mode, input.cadenceDays);
  // The permissive "gate never ran" identity: a branch that fires before it
  // reaches a gate passes this in, so the trace records "no data" for the gates
  // it never evaluated (skin-stability's counterpart is PERMISSIVE_SKIN_STABILITY).
  const noCadenceData: CadenceGateResult = { allowed: true, daysSinceLastDose: null };

  // `build` reports only the gate results it is handed — never closed-over
  // mutable state — so the trace can't depend on the walk's evaluation order.
  const build = (
    decision: LadderDecision,
    firedAt: number,
    gates: { stability: SkinStabilityGateResult; cadence: CadenceGateResult },
  ): LadderExplain => {
    const statusAt = (i: number): LadderPrecedenceStepStatus =>
      i > firedAt
        ? 'not-reached'
        : i === firedAt
          ? 'fired'
          : // Passed before the fired step. Only the two gate-backed steps
            // (indices 3, 4) can be permissive purely for lack of data.
            i === 3 && gates.stability.currentSeverity === null
            ? 'passed-no-data'
            : i === 4 && gates.cadence.daysSinceLastDose === null
              ? 'passed-no-data'
              : 'passed-confirmed';
    const stepsTuple: LadderPrecedenceSteps = [
      { name: 'permanent-or-empty', status: statusAt(0), detail: { step: 'permanent-or-empty' } },
      { name: 'ceiling', status: statusAt(1), detail: { step: 'ceiling' } },
      { name: 'reaction', status: statusAt(2), detail: { step: 'reaction' } },
      {
        name: 'skin-worsening',
        status: statusAt(3),
        detail: {
          step: 'skin-worsening',
          gate: gates.stability,
          windowDays: input.stabilityWindowDays,
        },
      },
      {
        name: 'cadence',
        status: statusAt(4),
        detail: { step: 'cadence', gate: gates.cadence, cadenceDays: cadenceDaysEff },
      },
      { name: 'advance-or-dwell', status: statusAt(5), detail: { step: 'advance-or-dwell' } },
    ];
    return { decision, snapshot, steps: stepsTuple, replay };
  };

  // (1) Permanent elimination or an empty stage ladder — the ladder is inert
  //     regardless of history.
  if (input.isPermanentlyEliminated || steps.length === 0) {
    return build({ kind: 'blocked' }, 0, {
      stability: PERMISSIVE_SKIN_STABILITY,
      cadence: noCadenceData,
    });
  }

  // (2) Ceiling — floor exhaustion (the lowest rung reacted). Terminal; defers
  // to human. The `severe` reason is authored on the union but not emitted here
  // yet — the severe-reaction branch lands in a later slice (ADR-0023 §6).
  if (state.ceilingRung) {
    return build(
      { kind: 'ceiling-reached', rung: state.ceilingRung, reason: 'floor-exhaustion' },
      1,
      { stability: PERMISSIVE_SKIN_STABILITY, cadence: noCadenceData },
    );
  }

  // (3) A reaction still resting: hold through the recovery window (ADR-0016).
  //     After the window the ladder does **not** re-climb the reacting rung
  //     (walk-down, PRD #454 §6); it falls through to re-confirm the
  //     stepped-down rung via its own dwell — so `reaction` only fires while the
  //     window is open, then yields to the gates below.
  if (state.pendingRest && today <= state.pendingRest.until) {
    const { rung, outcome, until } = state.pendingRest;
    return build({ kind: 'rest', rung, days: restDaysFor(outcome), until }, 2, {
      stability: PERMISSIVE_SKIN_STABILITY,
      cadence: noCadenceData,
    });
  }

  const liveRung = state.liveRung;

  // Rung the remaining holds refer to: the current rung, or the first step we
  // are about to attempt when nothing has been logged yet.
  const referenceRung = liveRung ?? steps[0]!;

  // (4) Skin-stability — hold when skin has worsened across the window. A
  //     steady baseline (even mild eczema at severity 1) is not a hold reason;
  //     only an *increase* over the window's baseline blocks escalation.
  //     The checkpoint verdict hold is retired (ADR-0023 §6): a recorded
  //     reaction is caught at (3); skin state is the surviving pre-cadence gate.
  const stability = skinStabilityGate(observations, today, input.stabilityWindowDays);
  if (!stability.allowed) {
    return build(
      {
        kind: 'hold',
        rung: referenceRung,
        reason: 'skin-worsening',
        baselineSeverity: stability.baselineSeverity as RegionLevel,
        currentSeverity: stability.currentSeverity as RegionLevel,
      },
      3,
      { stability, cadence: noCadenceData },
    );
  }

  // (5) Cadence — wait the required spacing since the last dose. The spacing is
  //     mode-driven: fast in probe, `≥ latency` in confirm so the engine never
  //     doses up into a window a delayed reaction to the previous dose could
  //     still be brewing in (ADR-0023 §6, PRD #454).
  const cadenceResult = cadenceGate(allergenId, meals, today, cadenceDaysEff);
  if (!cadenceResult.allowed) {
    return build(
      {
        kind: 'hold',
        rung: referenceRung,
        reason: 'cadence',
        daysRemaining: Math.max(0, cadenceDaysEff - (cadenceResult.daysSinceLastDose ?? 0)),
      },
      4,
      { stability, cadence: cadenceResult },
    );
  }

  // (6) Escalate one legal step — unless the climb is already at the effective
  //     top (the walk-down ceiling, or the structural top when none has walked
  //     down). At the effective top there is nowhere to climb; the rung dwells —
  //     held constant and confirmed `N` times at confirm cadence, terminal-
  //     evaluated at `last top dose + latency`. Only once the dwell completes is
  //     the rung `settled`; before then it reads as `passed` (a clean probe
  //     confirms the effective top rung only — dose–response is monotone).
  //     `isPermanentlyEliminated` is already handled at (1); pass it through so
  //     this stays consistent with `nextLegalStep`'s own contract.
  const evaluatedGates = { stability, cadence: cadenceResult };
  if (!state.atEffectiveTop) {
    const nextStep = nextLegalStep(liveRung, defaultLadder, stage, override, {
      isPermanentlyEliminated: input.isPermanentlyEliminated,
    });
    if (nextStep !== null)
      return build({ kind: 'advance', from: liveRung, to: nextStep }, 5, evaluatedGates);
  }

  // At the effective top. `N` = number of steps in the *default* ladder for the
  // stage (a finely-graded, usually more cautious allergen is confirmed more
  // thoroughly). Dwell complete once the effective top has been dosed `N` times
  // and the latency window since the last of those doses has elapsed.
  const topRung = liveRung as LadderStep;
  const dwellTarget = (defaultLadder.stages[stage] ?? []).length;
  const dwellComplete =
    state.dwell.count >= dwellTarget &&
    state.dwell.lastDoseDate !== null &&
    today >= addDays(state.dwell.lastDoseDate, REACTION_LATENCY_DAYS);
  return build(
    dwellComplete ? { kind: 'settled', rung: topRung } : { kind: 'passed', rung: topRung },
    5,
    evaluatedGates,
  );
}
