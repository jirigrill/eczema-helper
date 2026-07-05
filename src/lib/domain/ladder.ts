import type {
  Meal,
  PortionKind,
  ProtocolAllergenId,
  SkinObservation,
  RegionLevel
} from '$lib/domain/models';
import { overallSeverity } from '$lib/domain/models';
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import { LADDER_CADENCE_DAYS } from '$lib/domain/policy';

export type { FeedingStage, Ladder, LadderStep };

function foodTriggers(foodId: string): readonly string[] {
  const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find(
    (f) => f.id === foodId
  );
  if (food) return food.allergenIds;
  if (foodId.startsWith('other:')) return [foodId.slice(6)];
  return [];
}

function mealHitsAllergen(meal: Meal, allergenId: ProtocolAllergenId): boolean {
  return meal.items.some((i) => foodTriggers(i.foodId).includes(allergenId));
}

/**
 * Highest ladder rung whose anchor has been logged and not reacted-against.
 * Derived from meal history — never persisted (ADR-0012).
 *
 * `steps` is one feeding stage's rungs (`ladder.stages[stage]`) — the caller
 * picks the stage that matches the child's current feeding pattern.
 *
 * Returns `null` when the mother has not yet logged the ladder's first step.
 */
export function currentRung(
  allergenId: ProtocolAllergenId,
  meals: Meal[],
  steps: readonly LadderStep[]
): LadderStep | null {
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
 * The single next legal step above `rung` on `steps`, or `null` at the top.
 * Passing `null` returns the first step. Advancing more than one step is
 * impossible to express — the function returns a step or nothing.
 *
 * `opts.isPermanentlyEliminated` — when true (allergen is `permanent-mother`
 * or `permanent-baby` per ADR-0012), the ladder is inert: return `null`
 * regardless of the current rung. The permanent-elimination refusal is
 * absolute; no other gate can override it.
 */
export function nextLegalStep(
  rung: LadderStep | null,
  steps: readonly LadderStep[],
  opts?: { isPermanentlyEliminated?: boolean }
): LadderStep | null {
  if (opts?.isPermanentlyEliminated) return null;
  if (rung === null) return steps[0] ?? null;
  const idx = steps.findIndex((s) => s.id === rung.id);
  if (idx === -1) return null;
  return steps[idx + 1] ?? null;
}

// ── Gates ─────────────────────────────────────────────────────

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
 * history; threshold sourced from `policy.LADDER_CADENCE_DAYS`.
 */
export function cadenceGate(
  allergenId: ProtocolAllergenId,
  meals: Meal[],
  today: string
): CadenceGateResult {
  const matching = meals.filter((m) => mealHitsAllergen(m, allergenId));
  if (matching.length === 0) return { allowed: true, daysSinceLastDose: null };

  const lastDate = matching.map((m) => m.date).sort().at(-1) as string;
  const elapsed = daysSince(lastDate, today);
  return { allowed: elapsed >= LADDER_CADENCE_DAYS, daysSinceLastDose: elapsed };
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

