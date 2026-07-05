import type { Meal, PortionKind, ProtocolAllergenId } from '$lib/domain/models';
import type { Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

export type { Ladder, LadderStep };

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
 * Returns `null` when the mother has not yet logged the ladder's first step.
 */
export function currentRung(
  allergenId: ProtocolAllergenId,
  meals: Meal[],
  ladder: Ladder
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
  for (const step of ladder.steps) {
    const idx = anchors.indexOf(step.anchor, cursor);
    if (idx === -1) break;
    reached = step;
    cursor = idx + 1;
  }
  return reached;
}

/**
 * The single next legal step above `rung` on `ladder`, or `null` at the top.
 * Passing `null` returns the first step. Advancing more than one step is
 * impossible to express — the function returns a step or nothing.
 */
export function nextLegalStep(
  rung: LadderStep | null,
  ladder: Ladder
): LadderStep | null {
  if (rung === null) return ladder.steps[0] ?? null;
  const idx = ladder.steps.findIndex((s) => s.id === rung.id);
  if (idx === -1) return null;
  return ladder.steps[idx + 1] ?? null;
}

