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

// Mock baby solids — item counts deliberately vary per slot (lunch: 3,
// dinner: 5, with longer names) so the variants can be judged with a short
// list and a long, wrapping/truncating one. Dinner also includes an item
// that only conflicts for the baby (peanuts, via BABY_ONLY_ALLERGEN below)
// to demonstrate an actor-aware conflict badge the mother's row never shows.
const MOCK_BABY_ITEMS: Partial<Record<MealType, { name: string; foodId: string }[]>> = {
  lunch: [
    { name: 'Rýžová kaše', foodId: 'other:rice' },
    { name: 'Banánové pyré', foodId: 'other:banana' },
    { name: 'Hruškové pyré', foodId: 'other:pear' },
  ],
  dinner: [
    { name: 'Dušená brokolice', foodId: 'other:broccoli' },
    { name: 'Vařené brambory', foodId: 'other:potato' },
    { name: 'Kuřecí prsa na páře', foodId: 'other:chicken' },
    { name: 'Arašídové máslo (stopa)', foodId: 'other:peanuts' },
    { name: 'Banánové pyré s ovesnými vločkami', foodId: 'other:oats' },
  ],
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
 * Fixture mother meals for the standalone prototype page (no real IndexedDB
 * data needed). Item counts deliberately vary — breakfast: 1, lunch: 3,
 * snack: 5 with longer names — to see each variant with a single item, a
 * typical short list, and a long, wrapping/truncating one. Dinner is left
 * unset (empty state) so the baby-only dinner slot below has a contrast.
 */
export function fixtureMotherMeals(date: string): Meal[] {
  return [
    {
      id: `${date}:breakfast` as Meal['id'],
      date,
      mealType: 'breakfast',
      actor: 'mother',
      items: [{ id: '1', name: 'Jogurt', foodId: 'other:dairy', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    } as Meal,
    {
      id: `${date}:lunch` as Meal['id'],
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [
        { id: '1', name: 'Kuřecí polévka', foodId: 'other:rice', amount: 'portion' },
        { id: '2', name: 'Bramborová kaše', foodId: 'other:potato', amount: 'portion' },
        { id: '3', name: 'Dušená mrkev', foodId: 'other:carrot', amount: 'portion' },
      ],
      createdAt: new Date().toISOString(),
    } as Meal,
    {
      id: `${date}:snack` as Meal['id'],
      date,
      mealType: 'snack',
      actor: 'mother',
      items: [
        { id: '1', name: 'Celozrnný chléb s máslem', foodId: 'other:wheat', amount: 'portion' },
        { id: '2', name: 'Domácí jablečný kompot', foodId: 'other:apple', amount: 'portion' },
        { id: '3', name: 'Řecký jogurt s medem', foodId: 'other:dairy', amount: 'portion' },
        { id: '4', name: 'Vitamínový nápoj se zázvorem', foodId: 'other:ginger', amount: 'portion' },
        { id: '5', name: 'Ovesné sušenky se skořicí', foodId: 'other:oats', amount: 'portion' },
      ],
      createdAt: new Date().toISOString(),
    } as Meal,
  ];
}

export const FIXTURE_ELIMINATED_TODAY = ['dairy'];

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
