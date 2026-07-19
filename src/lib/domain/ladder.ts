import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type {
  AllergenOutcome,
  LadderAllergenId,
  Meal,
  PortionKind,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { overallSeverity } from '$lib/domain/models';
import {
  MAX_RUNG_REACTIONS,
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

/** A reaction still in effect: the rung that reacted and how recovery unwinds. */
export type PendingReaction = {
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
  /**
   * Probe/confirm mode, derived — never persisted (ADR-0023 §6, PRD #454).
   * `probe` before the first reaction; `confirm` once a reaction has been seen
   * *or* the climb has reached the top rung (a clean probe confirms the top).
   */
  mode: LadderMode;
  /**
   * Top-rung dwell progress — the two facts the `settled` terminal needs, always
   * derived and reset together (see `Dwell`). Once the climb reaches the top,
   * every further dose of the top rung's anchor advances the dwell; a reaction
   * restarts it. A clean probe confirms the *top rung only*, so only the top rung
   * dwells (dose–response is monotone); lower rungs are advanced through.
   */
  dwell: Dwell;
};

/**
 * Top-rung dwell state — how many times the top rung has been dosed and the date
 * of the last such dose, for the `last dose + latency` → `settled` terminal
 * (ADR-0023 §6, PRD #454). The two fields always move together: both advance on a
 * top-rung dose and both reset on a reaction (`NO_DWELL`), so a dose straddling a
 * reaction can never complete a dwell.
 */
export type Dwell = {
  /** Doses landed on the top rung so far. */
  count: number;
  /** ISO date of the most recent top-rung dose, or `null` before the top is reached. */
  lastDoseDate: string | null;
};

/** The empty dwell — no top-rung dose counted yet. Also the reaction reset. */
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
 * dated D binds to the highest still-live rung whose anchor was logged in a meal
 * on or before D (meals sort before same-date evaluations), drops the live rung
 * one step, and opens that rung for a re-test — so a reaction is a *temporary*
 * setback: a later clean re-dose re-advances, and a `tolerated` verdict clears
 * the pending reaction entirely. A reaction on the lowest rung (nowhere lower to
 * retreat) or the `MAX_RUNG_REACTIONS`-th reaction on one rung is a confirmed
 * ceiling — a single unified terminal that defers to human care (ADR-0023,
 * ADR-0024); the engine never sets a `permanent-*` status itself (ADR-0012).
 *
 * It also derives the probe/confirm **mode** and the top-rung **dwell** count
 * (ADR-0023 §6, PRD #454) purely from the same replay — no persisted flag: the
 * mode is `confirm` once any reaction has been seen or the climb has reached the
 * top rung, `probe` otherwise; the dwell count is how many times the top rung's
 * anchor has been dosed. `decideLadderMove` turns those into cadence and the
 * `settled` terminal.
 *
 * Written exactly once so `currentRung` and `decideLadderMove` cannot drift on
 * how a reaction moves the rung. Never exported.
 */
function deriveLadderState(
  allergenId: LadderAllergenId,
  meals: Meal[],
  evaluations: readonly ReintroductionEvaluation[],
  steps: readonly LadderStep[],
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
  let firstReactionSeen = false;
  let dwell: Dwell = NO_DWELL;
  const topIndex = steps.length - 1;
  const topAnchor = topIndex >= 0 ? steps[topIndex]!.anchor : null;

  for (const ev of events) {
    if (ceilingRung) break; // terminal — nothing that follows can move the ladder

    if (ev.kind === 'anchor') {
      if (nextStepIdx < steps.length && steps[nextStepIdx]!.anchor === ev.amount) {
        liveIndex = nextStepIdx;
        nextStepIdx += 1;
      }
      // Dwell counting: once the climb has reached the top rung, every dose of
      // the top rung's anchor is a confirmation dose (the arrival dose is #1,
      // each spaced re-dose thereafter increments). Only the top rung dwells —
      // a clean probe confirms the top only (dose–response is monotone).
      if (liveIndex === topIndex && topIndex >= 0 && ev.amount === topAnchor) {
        dwell = { count: dwell.count + 1, lastDoseDate: ev.date };
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
    firstReactionSeen = true; // any reaction flips the mode to confirm
    // A reaction interrupts the dwell's "held constant, tolerated" premise, so
    // the confirmation must restart: reset the top-rung dwell so `settled` can
    // never be reached by doses that straddle a reaction. (If the climb was not
    // yet at the top the dwell is already empty — resetting is a harmless no-op.)
    dwell = NO_DWELL;
    const reactingRung = steps[liveIndex]!;
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
      stepBackTo: steps[liveIndex - 1]!,
    };
    // Drop one rung and reopen the reacting rung for a re-test.
    liveIndex -= 1;
    nextStepIdx = liveIndex + 1;
  }

  const liveRung = liveIndex >= 0 ? steps[liveIndex]! : null;
  // Mode: `confirm` once a reaction has been seen, or once the climb has reached
  // the top rung (a clean probe confirms the top); `probe` otherwise. Derived,
  // never persisted — recomputed from the same replay every time (ADR-0012).
  const mode: LadderMode =
    firstReactionSeen || (topIndex >= 0 && liveIndex === topIndex) ? 'confirm' : 'probe';
  return {
    liveRung,
    lastPassingRung: pendingReaction?.stepBackTo ?? liveRung,
    pendingReaction,
    ceilingRung,
    reactionCounts,
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
export function skinCalmGate(observations: SkinObservation[], today: string): SkinCalmGateResult {
  const eligible = observations.filter((o) => o.date <= today);
  if (eligible.length === 0) return { allowed: true, isFlare: false, latestSeverity: null };

  eligible.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });
  const latest = eligible[eligible.length - 1]!;
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
  windowDays: number,
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
 * `from: null` is the first move (no separate `start`); `advance` and
 * `step-back` are distinct kinds because direction and reason differ. `rest`
 * carries `until` so "re-test becomes due" is computable without re-adding
 * `days` to `today`. `blocked` carries no rung — the ladder was inert from the
 * start; `ceiling-reached` carries the rung it got stuck at.
 *
 * Clinical-reshape variants (ADR-0023 §6, PRD #454) — declared here as
 * *types only* so later slices compile incrementally; `decideLadderMove` does
 * not emit them yet:
 *   - `settled` — a dose confirmed and held at its rung (probe/confirm walk).
 *   - `adapting-decelerate` — the open adaptation window: hold flat, keep
 *     re-dosing, never push through (emitted only while the window is open).
 *   - `suspected-reaction` — the detection tripwire: a hold that defers the
 *     "was that flare a reaction?" judgment to the mother, never an auto-ban.
 *
 * `ceiling-reached` carries a discriminated `reason` (mirroring how `hold`
 * discriminates on `reason`) so severity survives in the engine output:
 * `'floor-exhaustion'` (lowest rung reacts / per-rung cap hit — see §5) or
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
  | { kind: 'step-back'; from: LadderStep; to: LadderStep }
  | { kind: 'passed'; rung: LadderStep }
  | { kind: 'blocked' }
  | { kind: 'settled'; rung: LadderStep }
  | { kind: 'adapting-decelerate'; rung: LadderStep }
  | { kind: 'suspected-reaction'; rung: LadderStep }
  | { kind: 'ceiling-reached'; rung: LadderStep; reason: 'floor-exhaustion' | 'severe' };

// ── Explain/trace seam (issue #528, design #521) ──────────────

/**
 * A public projection of the private `deriveLadderState` replay — exactly the
 * five facts a visualizer renders once above the precedence trace (design #521,
 * PRD #454). `deriveLadderState`/`LadderReplayState` stay private (they also
 * carry `lastPassingRung`/`reactionCounts` bookkeeping never meant to be
 * load-bearing for consumers); this decouples the seam's contract from the
 * replay's internal shape. All five fields are always present with explicit
 * `null`s — no field is ever omitted for "nothing to report."
 */
export type LadderStateSnapshot = {
  liveRung: LadderStep | null;
  pendingReaction: PendingReaction | null;
  ceilingRung: LadderStep | null;
  mode: LadderMode;
  dwell: Dwell;
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
 * seam synthesizes no prose), the state snapshot, and the six precedence steps
 * exactly as walked. `explainLadderMove` returns this; `decideLadderMove`
 * returns just `.decision` from the same walk, so the two cannot drift.
 */
export type LadderExplain = {
  decision: LadderDecision;
  snapshot: LadderStateSnapshot;
  steps: LadderPrecedenceSteps;
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
 *   2. floor exhausted or per-rung cap hit → `ceiling-reached` (unified terminal);
 *   3. reaction still in effect → `rest` (rest window open) then `step-back`;
 *   4. skin worsened across the stability window → `hold('skin-worsening')`;
 *   5. cadence (mode-driven, `cadence ≥ latency` in confirm) not elapsed →
 *      `hold('cadence', daysRemaining)`;
 *   6. otherwise → `advance`; at the effective top, `passed` while the dwell
 *      confirmation is still running, then `settled` once it completes.
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
  const state = deriveLadderState(allergenId, meals, evaluations, steps);
  const snapshot: LadderStateSnapshot = {
    liveRung: state.liveRung,
    pendingReaction: state.pendingReaction,
    ceilingRung: state.ceilingRung,
    mode: state.mode,
    dwell: state.dwell,
  };

  // The two gate-backed steps' results and effective thresholds, seeded to the
  // permissive identity until the walk reaches them (so a trace that fired
  // earlier records "no data" for the gates it never ran).
  let cadenceDaysEff = 0;
  let cadenceResult: CadenceGateResult = { allowed: true, daysSinceLastDose: null };
  let stability: SkinStabilityGateResult = {
    allowed: true,
    baselineSeverity: null,
    currentSeverity: null,
  };
  const build = (decision: LadderDecision, firedAt: number): LadderExplain => {
    const statusAt = (i: number): LadderPrecedenceStepStatus =>
      i > firedAt
        ? 'not-reached'
        : i === firedAt
          ? 'fired'
          : // Passed before the fired step. Only the two gate-backed steps
            // (indices 3, 4) can be permissive purely for lack of data.
            i === 3 && stability.currentSeverity === null
            ? 'passed-no-data'
            : i === 4 && cadenceResult.daysSinceLastDose === null
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
          gate: stability,
          windowDays: input.stabilityWindowDays,
        },
      },
      {
        name: 'cadence',
        status: statusAt(4),
        detail: { step: 'cadence', gate: cadenceResult, cadenceDays: cadenceDaysEff },
      },
      { name: 'advance-or-dwell', status: statusAt(5), detail: { step: 'advance-or-dwell' } },
    ];
    return { decision, snapshot, steps: stepsTuple };
  };

  // (1) Permanent elimination or an empty stage ladder — the ladder is inert
  //     regardless of history.
  if (input.isPermanentlyEliminated || steps.length === 0) {
    return build({ kind: 'blocked' }, 0);
  }

  // (2) Ceiling — per-rung cap or floor exhaustion. Terminal; defers to human.
  // The `severe` reason is authored on the union but not emitted here yet — the
  // severe-reaction branch lands in a later slice (ADR-0023 §6, PRD #454).
  if (state.ceilingRung) {
    return build(
      { kind: 'ceiling-reached', rung: state.ceilingRung, reason: 'floor-exhaustion' },
      1,
    );
  }

  // (3) A reaction still in effect: rest while the recovery window is open, then
  //     step back to the last-passing rung to re-test.
  if (state.pendingReaction) {
    const { rung, outcome, until, stepBackTo } = state.pendingReaction;
    if (today <= until) return build({ kind: 'rest', rung, days: restDaysFor(outcome), until }, 2);
    return build({ kind: 'step-back', from: rung, to: stepBackTo }, 2);
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
  stability = skinStabilityGate(observations, today, input.stabilityWindowDays);
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
    );
  }

  // (5) Cadence — wait the required spacing since the last dose. The spacing is
  //     mode-driven: fast in probe, `≥ latency` in confirm so the engine never
  //     doses up into a window a delayed reaction to the previous dose could
  //     still be brewing in (ADR-0023 §6, PRD #454).
  cadenceDaysEff = effectiveCadenceDays(state.mode, input.cadenceDays);
  cadenceResult = cadenceGate(allergenId, meals, today, cadenceDaysEff);
  if (!cadenceResult.allowed) {
    return build(
      {
        kind: 'hold',
        rung: referenceRung,
        reason: 'cadence',
        daysRemaining: Math.max(0, cadenceDaysEff - (cadenceResult.daysSinceLastDose ?? 0)),
      },
      4,
    );
  }

  // (6) Escalate one legal step. At the effective top there is nowhere to climb;
  //     instead the top rung dwells — held constant and confirmed `N` times at
  //     confirm cadence, terminal-evaluated at `last top dose + latency`. Only
  //     once the dwell completes is the rung `settled`; before then it reads as
  //     `passed` (a clean probe confirms the top rung only — dose–response is
  //     monotone). `isPermanentlyEliminated` is already handled at (1); pass it
  //     through so this stays consistent with `nextLegalStep`'s own contract.
  const nextStep = nextLegalStep(liveRung, defaultLadder, stage, override, {
    isPermanentlyEliminated: input.isPermanentlyEliminated,
  });
  if (nextStep !== null) return build({ kind: 'advance', from: liveRung, to: nextStep }, 5);

  // At the effective top. `N` = number of steps in the *default* ladder for the
  // stage (a finely-graded, usually more cautious allergen is confirmed more
  // thoroughly). Dwell complete once the top rung has been dosed `N` times and
  // the latency window since the last of those doses has elapsed.
  const topRung = liveRung as LadderStep;
  const dwellTarget = (defaultLadder.stages[stage] ?? []).length;
  const dwellComplete =
    state.dwell.count >= dwellTarget &&
    state.dwell.lastDoseDate !== null &&
    today >= addDays(state.dwell.lastDoseDate, REACTION_LATENCY_DAYS);
  return build(
    dwellComplete ? { kind: 'settled', rung: topRung } : { kind: 'passed', rung: topRung },
    5,
  );
}
