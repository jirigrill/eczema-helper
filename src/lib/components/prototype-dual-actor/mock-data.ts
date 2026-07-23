// PROTOTYPE — wayfinder ticket #557 (day-view dual-actor slot layout).
// Throwaway: answers "how does a slot show mother + child separately", not
// production code. Delete this whole `prototype-dual-actor/` directory once
// a variant is chosen and folded into MealCard.
//
// Real data has no `actor: 'baby'` meals yet (issue #554's key migration is a
// decided-but-unbuilt follow-up), so this file fabricates a plausible baby
// side for each slot to make the three variants judgeable.

import type { Meal, MealType } from '$lib/domain/models';
import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';

export type FeedingStageDemo = 'breastfed' | 'mixed' | 'solids';

export type RenderItem = { name: string; conflict: boolean };
export type RenderMeal = { items: RenderItem[]; conflictAllergens: string[] };
export type ActorState =
  | { status: 'logged'; render: RenderMeal }
  | { status: 'empty' }
  | { status: 'not-eligible' };

export type DualSlot = {
  type: MealType;
  mother: ActorState;
  baby: ActorState;
};

const catalog = new BundledCatalogAdapter();

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Mock baby solids — deliberately includes one item that only conflicts for
// the baby (peanuts, via BABY_ONLY_ALLERGEN below) to demonstrate an
// actor-aware conflict badge that the mother's own row would never show.
const MOCK_BABY_ITEMS: Partial<Record<MealType, { name: string; foodId: string }[]>> = {
  lunch: [{ name: 'Rýžová kaše', foodId: 'other:rice' }],
  dinner: [{ name: 'Arašídové máslo (stopa)', foodId: 'other:peanuts' }],
};

const BABY_ONLY_ALLERGEN = 'peanuts';

function toRenderMeal(
  items: { name: string; foodId: string }[],
  eliminated: string[],
): RenderMeal {
  const conflictAllergens = [
    ...new Set(
      items.flatMap((item) => catalog.allergensForFood(item.foodId)).filter((a) => eliminated.includes(a)),
    ),
  ];
  const renderItems = items.map((item) => {
    const triggers = catalog.allergensForFood(item.foodId);
    return { name: item.name, conflict: triggers.some((t) => eliminated.includes(t)) };
  });
  return { items: renderItems, conflictAllergens };
}

/**
 * Builds the per-slot, per-actor read model the variants render from.
 * `stage` governs which actors are eligible at all (the collapse case);
 * `meals` is the real mother data for the day, `eliminatedToday` her real
 * restrictions. The baby side is mocked in for slots listed above.
 */
export function buildDualSlots(
  meals: Meal[],
  eliminatedToday: string[],
  stage: FeedingStageDemo,
): DualSlot[] {
  const babyEliminated = [...eliminatedToday, BABY_ONLY_ALLERGEN];
  const motherEligible = stage === 'breastfed' || stage === 'mixed';
  const babyEligible = stage === 'mixed' || stage === 'solids';

  return MEAL_TYPE_ORDER.map((type) => {
    const motherMeal = meals.find((m) => m.mealType === type);
    const mother: ActorState = !motherEligible
      ? { status: 'not-eligible' }
      : motherMeal
        ? { status: 'logged', render: toRenderMeal(motherMeal.items, eliminatedToday) }
        : { status: 'empty' };

    const babyItems = MOCK_BABY_ITEMS[type];
    const baby: ActorState = !babyEligible
      ? { status: 'not-eligible' }
      : babyItems
        ? { status: 'logged', render: toRenderMeal(babyItems, babyEliminated) }
        : { status: 'empty' };

    return { type, mother, baby };
  });
}
