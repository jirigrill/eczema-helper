import { describe, expect, it } from 'vitest';

import type { FoodId } from '$lib/data/allergen-catalog/allergen-catalog';

import type { Meal, MealItem } from './models';
import {
  allConfirmedFoods,
  cancelEditing,
  commitFamily,
  confirmFood,
  confirmedFoodsForFamily,
  copyMealInto,
  deselectFood,
  editingFood,
  emptyWorkingMeal,
  finalizeWorkingMeal,
  foodsForFamily,
  fromMealItems,
  isNonEmpty,
  removeFood,
  startEditing,
  toMealItems,
  updateEditingAmount,
  updateEditingPreparation,
} from './working-meal';
import type { WorkingMeal } from './working-meal';

// ── Helpers ──────────────────────────────────────────────────

const FAM = 'dairy' as const;
const FOOD_A: FoodId = 'kravske-mleko';
const FOOD_B: FoodId = 'tvaroh';

function mealWithFood(foodId: FoodId = FOOD_A, name = 'Kravské mléko'): WorkingMeal {
  return startEditing(emptyWorkingMeal(), FAM, foodId, name);
}

function mealWithConfirmed(foodId: FoodId = FOOD_A, name = 'Kravské mléko'): WorkingMeal {
  return confirmFood(mealWithFood(foodId, name), FAM, foodId);
}

// ── Tracer bullet: startEditing + confirmFood ────────────────

describe('startEditing', () => {
  it('puts the food into editing state', () => {
    const meal = mealWithFood();
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state.status).toBe('editing');
  });

  it('defaults amount to "portion"', () => {
    const meal = mealWithFood();
    const food = foodsForFamily(meal, FAM)[0];
    expect(food?.state).toMatchObject({ status: 'editing', amount: 'portion' });
  });

  it('locks other foods in the same family when editing starts', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_B starts editing; FOOD_A becomes locked
    const a = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(a?.state.status).toBe('locked');
  });

  it('restores cached amount when re-selecting a previously confirmed food', () => {
    let meal = mealWithConfirmed();
    meal = updateEditingAmount(
      startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A'),
      FAM,
      FOOD_A,
      'teaspoon',
    );
    meal = confirmFood(meal, FAM, FOOD_A);
    meal = deselectFood(meal, FAM, FOOD_A);
    meal = startEditing(meal, FAM, FOOD_A, 'A');
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state).toMatchObject({ status: 'editing', amount: 'teaspoon' });
  });
});

describe('confirmFood', () => {
  it('moves food from editing to confirmed', () => {
    const meal = mealWithConfirmed();
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state.status).toBe('confirmed');
  });

  it('preserves amount in confirmed state', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'spoon');
    meal = confirmFood(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state).toMatchObject({ status: 'confirmed', amount: 'spoon' });
  });

  it('restores locked-idle foods to idle after confirmation', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_A locked(idle)
    meal = confirmFood(meal, FAM, FOOD_B);
    const a = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(a?.state.status).toBe('idle');
  });

  it('restores locked-confirmed foods to confirmed after confirmation', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = confirmFood(meal, FAM, FOOD_A); // FOOD_A: confirmed
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_A: locked(confirmed), FOOD_B: editing
    meal = confirmFood(meal, FAM, FOOD_B); // FOOD_B: confirmed, FOOD_A: restored to confirmed
    const a = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(a?.state.status).toBe('confirmed');
  });

  it('caches amount + preparation so re-select restores them', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'boiled');
    meal = confirmFood(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.cachedAmount).toBe('portion');
    expect(food?.cachedPreparation).toBe('boiled');
  });
});

// ── cancelEditing ────────────────────────────────────────────

describe('cancelEditing', () => {
  it('returns food to idle state', () => {
    let meal = mealWithFood();
    meal = cancelEditing(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state.status).toBe('idle');
  });

  it('caches nothing on cancel', () => {
    let meal = mealWithFood();
    meal = cancelEditing(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.cachedAmount).toBeUndefined();
    expect(food?.cachedPreparation).toBeUndefined();
  });

  it('unlocks other foods on cancel', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_A locked
    meal = cancelEditing(meal, FAM, FOOD_B);
    const a = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(a?.state.status).toBe('idle');
  });
});

// ── deselectFood ─────────────────────────────────────────────

describe('deselectFood', () => {
  it('moves confirmed food back to idle', () => {
    let meal = mealWithConfirmed();
    meal = deselectFood(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state.status).toBe('idle');
  });

  it('preserves cache after deselect (so re-select restores)', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'pinch');
    meal = confirmFood(meal, FAM, FOOD_A);
    meal = deselectFood(meal, FAM, FOOD_A);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.cachedAmount).toBe('pinch');
  });

  it('is a no-op for a food that is not confirmed', () => {
    let meal = mealWithFood(); // editing
    const before = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A)?.state;
    meal = deselectFood(meal, FAM, FOOD_A);
    const after = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A)?.state;
    expect(after).toEqual(before);
  });
});

// ── updateEditingAmount / updateEditingPreparation ────────────

describe('updateEditingAmount', () => {
  it('updates amount while editing', () => {
    let meal = mealWithFood();
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'teaspoon');
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state).toMatchObject({ status: 'editing', amount: 'teaspoon' });
  });

  it('is a no-op when food is not editing', () => {
    let meal = mealWithConfirmed();
    const before = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A)?.state;
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'pinch');
    const after = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A)?.state;
    expect(after).toEqual(before);
  });
});

describe('updateEditingPreparation', () => {
  it('sets preparation while editing', () => {
    let meal = mealWithFood();
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'boiled');
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(food?.state).toMatchObject({ status: 'editing', preparation: 'boiled' });
  });

  it('toggles preparation off when set to undefined', () => {
    let meal = mealWithFood();
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'boiled');
    meal = updateEditingPreparation(meal, FAM, FOOD_A, undefined);
    const food = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect((food?.state as { preparation?: string }).preparation).toBeUndefined();
  });
});

// ── commitFamily ─────────────────────────────────────────────

describe('commitFamily', () => {
  it('removes idle/cancelled foods, keeps confirmed foods', () => {
    // Confirm FOOD_A, then add FOOD_B (stays idle, never confirmed), then commit
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = confirmFood(meal, FAM, FOOD_A); // FOOD_A: confirmed
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_A: locked(confirmed), FOOD_B: editing
    meal = cancelEditing(meal, FAM, FOOD_B); // FOOD_B: idle, FOOD_A: restored to confirmed
    meal = commitFamily(meal, FAM);
    const foods = foodsForFamily(meal, FAM);
    expect(foods.some((f) => f.foodId === FOOD_B)).toBe(false);
    expect(foods.some((f) => f.foodId === FOOD_A)).toBe(true);
  });

  it('keeps confirmed foods after commit', () => {
    let meal = mealWithConfirmed();
    meal = commitFamily(meal, FAM);
    expect(confirmedFoodsForFamily(meal, FAM)).toHaveLength(1);
  });
});

// ── allConfirmedFoods + confirmedFoodsForFamily ──────────────

describe('allConfirmedFoods', () => {
  it('returns empty array for empty meal', () => {
    expect(allConfirmedFoods(emptyWorkingMeal())).toHaveLength(0);
  });

  it('returns confirmed foods across multiple families', () => {
    const FAM2 = 'grains' as const;
    let meal = mealWithConfirmed(FOOD_A, 'A');
    meal = startEditing(meal, FAM2, 'psenice', 'Pšenice');
    meal = confirmFood(meal, FAM2, 'psenice');
    expect(allConfirmedFoods(meal)).toHaveLength(2);
  });
});

// ── editingFood ───────────────────────────────────────────────

describe('editingFood', () => {
  it('returns the editing food when one is editing', () => {
    const meal = mealWithFood();
    expect(editingFood(meal, FAM)?.foodId).toBe(FOOD_A);
  });

  it('returns null when no food is editing', () => {
    expect(editingFood(emptyWorkingMeal(), FAM)).toBeNull();
  });
});

// ── toMealItems ───────────────────────────────────────────────

describe('toMealItems', () => {
  it('converts confirmed foods to MealItem[]', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'Kravské mléko');
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'spoon');
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'boiled');
    meal = confirmFood(meal, FAM, FOOD_A);
    const items = toMealItems(meal);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: 'Kravské mléko',
      foodId: FOOD_A,
      amount: 'spoon',
      preparationMethod: 'boiled',
    });
    expect(items[0]!.id).toBeTruthy(); // randomUUID assigned
  });

  it('returns empty array for empty meal', () => {
    expect(toMealItems(emptyWorkingMeal())).toHaveLength(0);
  });
});

// ── Round-trip: toMealItems → fromMealItems ───────────────────

describe('toMealItems / fromMealItems round-trip', () => {
  it('round-trips raw (Syrové) preparation through confirm → toMealItems → fromMealItems', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'Kravské mléko');
    meal = updateEditingAmount(meal, FAM, FOOD_A, 'spoon');
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'raw');
    meal = confirmFood(meal, FAM, FOOD_A);

    const items = toMealItems(meal);
    expect(items[0]!.preparationMethod).toBe('raw');

    const restored = fromMealItems(items);
    const restoredFood = foodsForFamily(restored, FAM).find((f) => f.foodId === FOOD_A);
    expect(restoredFood?.state).toMatchObject({
      status: 'confirmed',
      amount: 'spoon',
      preparation: 'raw',
    });
  });

  it('round-trips boiled preparation through the same cycle', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'Kravské mléko');
    meal = updateEditingPreparation(meal, FAM, FOOD_A, 'boiled');
    meal = confirmFood(meal, FAM, FOOD_A);
    const restored = fromMealItems(toMealItems(meal));
    const restoredFood = foodsForFamily(restored, FAM).find((f) => f.foodId === FOOD_A);
    expect(restoredFood?.state).toMatchObject({ preparation: 'boiled' });
  });

  it('round-trips an unset preparation as undefined', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'Kravské mléko');
    meal = confirmFood(meal, FAM, FOOD_A);
    const restored = fromMealItems(toMealItems(meal));
    const restoredFood = foodsForFamily(restored, FAM).find((f) => f.foodId === FOOD_A);
    expect(restoredFood?.state).toMatchObject({ preparation: undefined });
  });

  // Issue #662: `FoodId` is the catalog's own id union, so a food id absent
  // from FOODS is a stale persisted row. It used to be bucketed into a `custom`
  // family; there is no such family to invent one from any more, and quietly
  // dropping it would shrink a logged meal without saying so.
  it('throws on an item whose foodId is absent from the catalog', () => {
    expect(() =>
      fromMealItems([
        { id: 'i1', name: 'Kravské mléko', foodId: FOOD_A, amount: 'spoon' },
        // Cast past the narrowed FoodId — any non-catalog id reaches here only
        // from disk. A retired catalog slug, not an `other:` one: the guard is
        // about the id being unknown, not about the removed custom-food prefix.
        {
          id: 'i2',
          name: 'Kokos',
          foodId: 'zrusena-potravina' as MealItem['foodId'],
          amount: 'portion',
        },
      ]),
    ).toThrow(/zrusena-potravina/);
  });
});

// ── Active edit slot invariant ────────────────────────────────

describe('active edit slot invariant', () => {
  it('only one food can be editing at a time within a family', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = startEditing(meal, FAM, FOOD_B, 'B');
    const editingCount = foodsForFamily(meal, FAM).filter(
      (f) => f.state.status === 'editing',
    ).length;
    expect(editingCount).toBe(1);
  });
});

// ── removeFood ────────────────────────────────────────────────

describe('removeFood', () => {
  it('removes a confirmed food from the working list', () => {
    let meal = mealWithConfirmed();
    meal = removeFood(meal, FAM, FOOD_A);
    expect(foodsForFamily(meal, FAM).some((f) => f.foodId === FOOD_A)).toBe(false);
  });

  it('removes an idle food from the working list', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = cancelEditing(meal, FAM, FOOD_A); // now idle
    meal = removeFood(meal, FAM, FOOD_A);
    expect(foodsForFamily(meal, FAM).some((f) => f.foodId === FOOD_A)).toBe(false);
  });

  it('is a no-op when the foodId is not present', () => {
    const meal = mealWithConfirmed();
    // Cast past the narrowed FoodId: exercises the miss branch on an id no
    // valid caller could produce.
    const after = removeFood(meal, FAM, 'nonexistent-food' as FoodId);
    expect(foodsForFamily(after, FAM)).toEqual(foodsForFamily(meal, FAM));
  });

  it('removes only the targeted food, leaving others intact', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = confirmFood(meal, FAM, FOOD_A);
    meal = startEditing(meal, FAM, FOOD_B, 'B');
    meal = confirmFood(meal, FAM, FOOD_B);
    meal = removeFood(meal, FAM, FOOD_A);
    const foods = foodsForFamily(meal, FAM);
    expect(foods.some((f) => f.foodId === FOOD_A)).toBe(false);
    expect(foods.some((f) => f.foodId === FOOD_B)).toBe(true);
  });

  it('removing the editing food unlocks all locked siblings', () => {
    let meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    meal = confirmFood(meal, FAM, FOOD_A);
    meal = startEditing(meal, FAM, FOOD_B, 'B'); // FOOD_A locked(confirmed), FOOD_B editing
    meal = removeFood(meal, FAM, FOOD_B); // remove the editing food
    const a = foodsForFamily(meal, FAM).find((f) => f.foodId === FOOD_A);
    expect(a?.state.status).not.toBe('locked');
  });

  it('does not persist — allConfirmedFoods excludes removed food', () => {
    let meal = mealWithConfirmed();
    meal = removeFood(meal, FAM, FOOD_A);
    expect(allConfirmedFoods(meal)).toHaveLength(0);
  });
});

// ── isNonEmpty ────────────────────────────────────────────────

describe('isNonEmpty', () => {
  it('returns false for an empty working meal', () => {
    expect(isNonEmpty(emptyWorkingMeal())).toBe(false);
  });

  it('returns false when only idle foods are present', () => {
    const meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    const idleMeal = cancelEditing(meal, FAM, FOOD_A);
    expect(isNonEmpty(idleMeal)).toBe(false);
  });

  it('returns true when at least one confirmed food exists', () => {
    expect(isNonEmpty(mealWithConfirmed())).toBe(true);
  });

  it('returns true when at least one food is currently editing', () => {
    const meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'A');
    expect(isNonEmpty(meal)).toBe(true);
  });
});

// ── finalizeWorkingMeal ──────────────────────────────────────

describe('finalizeWorkingMeal', () => {
  const SLOT = { date: '2026-05-27', mealType: 'lunch' as const, actor: 'mother' as const };
  const NOW = '2026-05-27T12:00:00.000Z';

  it('returns null when the working meal has no confirmed items (empty no-op)', () => {
    const meal = startEditing(emptyWorkingMeal(), FAM, FOOD_A, 'Kravské mléko');
    // Food is only in editing state, not confirmed → toMealItems yields [].
    expect(finalizeWorkingMeal(SLOT, meal, '', null, NOW)).toBeNull();
  });

  it('compose-new mints a fresh createdAt and omits updatedAt', () => {
    const meal = mealWithConfirmed();
    const result = finalizeWorkingMeal(SLOT, meal, '', null, NOW);
    expect(result).not.toBeNull();
    expect(result!.createdAt).toBe(NOW);
    expect(result!.updatedAt).toBeUndefined();
  });

  it('edit preserves the loaded createdAt and stamps updatedAt with now', () => {
    const meal = mealWithConfirmed();
    const originalCreatedAt = '2026-05-20T09:00:00.000Z';
    const result = finalizeWorkingMeal(SLOT, meal, '', originalCreatedAt, NOW);
    expect(result).not.toBeNull();
    expect(result!.createdAt).toBe(originalCreatedAt);
    expect(result!.updatedAt).toBe(NOW);
  });

  it('sets id to `${date}:${mealType}:${actor}` composite key', () => {
    const meal = mealWithConfirmed();
    const result = finalizeWorkingMeal(SLOT, meal, '', null, NOW);
    expect(result!.id).toBe('2026-05-27:lunch:mother');
  });

  it('carries date, mealType, and actor from the slot', () => {
    const meal = mealWithConfirmed();
    const result = finalizeWorkingMeal(SLOT, meal, '', null, NOW);
    expect(result).toMatchObject({
      date: '2026-05-27',
      mealType: 'lunch',
      actor: 'mother',
    });
  });

  it('trims notes and drops purely-whitespace notes to undefined', () => {
    const meal = mealWithConfirmed();
    expect(finalizeWorkingMeal(SLOT, meal, '  hello  ', null, NOW)!.notes).toBe('hello');
    expect(finalizeWorkingMeal(SLOT, meal, '   ', null, NOW)!.notes).toBeUndefined();
    expect(finalizeWorkingMeal(SLOT, meal, '', null, NOW)!.notes).toBeUndefined();
  });
});

// ── copyMealInto ─────────────────────────────────────────────

describe('copyMealInto', () => {
  const NOW = '2026-06-01T08:00:00.000Z';

  function item(overrides: Partial<MealItem> = {}): MealItem {
    return {
      id: 'src-item-1',
      name: 'Kravské mléko',
      foodId: 'kravske-mleko' as MealItem['foodId'],
      amount: 'spoon',
      preparationMethod: 'boiled',
      ...overrides,
    };
  }

  function source(items: MealItem[], overrides: Partial<Meal> = {}): Meal {
    return {
      id: '2026-05-27:lunch:mother',
      date: '2026-05-27',
      mealType: 'lunch',
      actor: 'mother',
      items,
      notes: 'source note',
      createdAt: '2026-05-27T12:00:00.000Z',
      ...overrides,
    };
  }

  const DEST_SLOT = { date: '2026-06-01', mealType: 'dinner' as const, actor: 'mother' as const };

  it('composes a new meal when the destination is empty', () => {
    const src = source([item()]);
    const result = copyMealInto(src, null, DEST_SLOT, NOW);
    expect(result.meal).not.toBeNull();
    expect(result.meal!.id).toBe('2026-06-01:dinner:mother');
    expect(result.meal!.date).toBe('2026-06-01');
    expect(result.meal!.mealType).toBe('dinner');
    expect(result.meal!.actor).toBe('mother');
  });

  it('empty destination: fresh createdAt from now, updatedAt unset', () => {
    const src = source([item()]);
    const result = copyMealInto(src, null, DEST_SLOT, NOW);
    expect(result.meal!.createdAt).toBe(NOW);
    expect(result.meal!.updatedAt).toBeUndefined();
  });

  it('empty destination: source note never travels', () => {
    const src = source([item()], { notes: 'source note' });
    const result = copyMealInto(src, null, DEST_SLOT, NOW);
    expect(result.meal!.notes).toBeUndefined();
  });

  it('empty destination: all source items carried with fresh ids; added == all items', () => {
    const src = source([
      item({ id: 'src-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
      item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
    ]);
    const result = copyMealInto(src, null, DEST_SLOT, NOW);
    expect(result.meal!.items).toHaveLength(2);
    expect(result.added).toHaveLength(2);
    expect(result.added).toEqual(result.meal!.items);
    for (const carried of result.meal!.items) {
      expect(carried.id).not.toBe('src-1');
      expect(carried.id).not.toBe('src-2');
    }
  });

  it('empty destination: carried items copy name/foodId/amount/preparationMethod verbatim', () => {
    const src = source([
      item({
        id: 'src-1',
        name: 'Tvaroh',
        foodId: 'tvaroh' as MealItem['foodId'],
        amount: 'pinch',
        preparationMethod: 'raw',
      }),
    ]);
    const result = copyMealInto(src, null, DEST_SLOT, NOW);
    expect(result.meal!.items[0]).toMatchObject({
      name: 'Tvaroh',
      foodId: 'tvaroh',
      amount: 'pinch',
      preparationMethod: 'raw',
    });
  });

  it('occupied destination: adds only foods the destination lacks; added == exactly those', () => {
    const src = source([
      item({ id: 'src-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
      item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
    ]);
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
      notes: 'dest note',
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.added).toHaveLength(1);
    expect(result.added[0]!.foodId).toBe('tvaroh');
    expect(result.meal!.items.map((i) => i.foodId)).toEqual(['kravske-mleko', 'tvaroh']);
  });

  it('occupied destination: preserves destination createdAt + notes, stamps updatedAt', () => {
    const src = source([item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'] })]);
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
      notes: 'dest note',
      createdAt: '2026-05-31T10:00:00.000Z',
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal!.createdAt).toBe('2026-05-31T10:00:00.000Z');
    expect(result.meal!.notes).toBe('dest note');
    expect(result.meal!.updatedAt).toBe(NOW);
  });

  it('occupied destination: destination wins on collision even when portion/prep differ', () => {
    const src = source([
      item({
        id: 'src-1',
        foodId: 'kravske-mleko' as MealItem['foodId'],
        amount: 'package',
        preparationMethod: 'fried',
      }),
    ]);
    const target = source(
      [
        item({
          id: 'dst-1',
          foodId: 'kravske-mleko' as MealItem['foodId'],
          amount: 'pinch',
          preparationMethod: 'raw',
        }),
      ],
      { id: '2026-06-01:dinner:mother', date: '2026-06-01', mealType: 'dinner' },
    );
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal).toBeNull();
    expect(result.added).toEqual([]);
  });

  it('occupied destination: dedup drops a source food identical in portion+prep', () => {
    const src = source([
      item({ id: 'src-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
      item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
    ]);
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal!.items.filter((i) => i.foodId === 'kravske-mleko')).toHaveLength(1);
  });

  it('occupied destination: source note never travels', () => {
    const src = source([item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'] })], {
      notes: 'source note',
    });
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
      notes: 'dest note',
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal!.notes).toBe('dest note');
  });

  it('occupied destination with no destination note stays undefined after merge', () => {
    const src = source([item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'] })], {
      notes: 'source note',
    });
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
      notes: undefined,
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal!.notes).toBeUndefined();
  });

  it('no-op when destination already holds every source foodId (full overlap into a different slot)', () => {
    const src = source([
      item({ id: 'src-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
      item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
    ]);
    const target = source(
      [
        item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
        item({ id: 'dst-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
      ],
      { id: '2026-06-01:dinner:mother', date: '2026-06-01', mealType: 'dinner' },
    );
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.meal).toBeNull();
    expect(result.added).toEqual([]);
  });

  it('no-op when copying a meal onto its own slot', () => {
    const items = [
      item({ id: 'src-1', foodId: 'kravske-mleko' as MealItem['foodId'] }),
      item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'], name: 'Tvaroh' }),
    ];
    const src = source(items);
    const ownSlot = { date: '2026-05-27', mealType: 'lunch' as const, actor: 'mother' as const };
    const result = copyMealInto(src, src, ownSlot, NOW);
    expect(result.meal).toBeNull();
    expect(result.added).toEqual([]);
  });

  it('added items each get a fresh id distinct from the source item id', () => {
    const src = source([item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'] })]);
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
    });
    const result = copyMealInto(src, target, DEST_SLOT, NOW);
    expect(result.added[0]!.id).not.toBe('src-2');
    expect(result.added[0]!.id).toBeTruthy();
  });

  it('does not mutate the destination meal', () => {
    const target = source([item({ id: 'dst-1', foodId: 'kravske-mleko' as MealItem['foodId'] })], {
      id: '2026-06-01:dinner:mother',
      date: '2026-06-01',
      mealType: 'dinner',
    });
    const src = source([item({ id: 'src-2', foodId: 'tvaroh' as MealItem['foodId'] })]);
    copyMealInto(src, target, DEST_SLOT, NOW);
    expect(target.items).toHaveLength(1);
    expect(target.updatedAt).toBeUndefined();
  });
});
