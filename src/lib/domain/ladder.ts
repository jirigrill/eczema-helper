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
import { REST_PHASE_DAYS_MILD, REST_PHASE_DAYS_CLEAR, REST_PHASE_DAYS_SEVERE } from '$lib/domain/policy';

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

/**
 * Highest ladder rung whose anchor has been logged and not reacted-against,
 * for the given `stage` on the effective ladder (default merged with any
 * override — see `resolveLadder`). Derived from meal history — never
 * persisted (ADR-0012).
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
  override?: Ladder | null
): LadderStep | null {
  const steps = resolveLadder(defaultLadder, override).stages[stage] ?? [];
  const anchors: PortionKind[] = [];
  const ordered = [...meals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const meal of ordered) {
    if (!mealHitsAllergen(meal, allergenId)) continue;
    for (const item of meal.items) {
      if (foodTriggers(item.foodId).includes(allergenId)) {
        anchors.push(item.amount);
      }
    }
  }

  let reached: LadderStep | null = null;
  let cursor = 0;
  for (const step of steps) {
    const idx = anchors.indexOf(step.anchor, cursor);
    if (idx === -1) break;
    reached = step;
    cursor = idx + 1;
  }
  return reached;
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

  const restDays =
    outcome === 'mild-reaction' ? REST_PHASE_DAYS_MILD :
    outcome === 'clear-reaction' ? REST_PHASE_DAYS_CLEAR :
    REST_PHASE_DAYS_SEVERE;
  return { allowed: false, requiresRest: true, restDays };
}

