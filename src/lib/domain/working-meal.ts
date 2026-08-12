import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
import type { Meal, MealItem, MealSlot, PortionKind, PreparationMethod } from '$lib/domain/models';
import { mealId } from '$lib/domain/models';
import { randomUUID } from '$lib/utils/uuid';

export type FoodEditState =
  | { status: 'idle' }
  | { status: 'editing'; amount: PortionKind; preparation?: PreparationMethod }
  | { status: 'confirmed'; amount: PortionKind; preparation?: PreparationMethod }
  | { status: 'locked'; prior: 'idle' | 'confirmed' };

export type WorkingFood = {
  foodId: string;
  name: string;
  state: FoodEditState;
  /** Last-confirmed amount — restored when a confirmed food is re-selected. */
  cachedAmount?: PortionKind;
  /** Last-confirmed preparation — restored when a confirmed food is re-selected. */
  cachedPreparation?: PreparationMethod;
};

export type WorkingFamily = {
  familyId: FamilyId;
  foods: WorkingFood[];
};

export type WorkingMeal = {
  families: WorkingFamily[];
  notes: string;
};

export function emptyWorkingMeal(): WorkingMeal {
  return { families: [], notes: '' };
}

// ── Internal helpers ─────────────────────────────────────────

function mapFood(
  meal: WorkingMeal,
  familyId: FamilyId,
  foodId: string,
  fn: (f: WorkingFood) => WorkingFood,
): WorkingMeal {
  return {
    ...meal,
    families: meal.families.map((fam) =>
      fam.familyId !== familyId
        ? fam
        : { ...fam, foods: fam.foods.map((f) => (f.foodId === foodId ? fn(f) : f)) },
    ),
  };
}

function mapFamily(
  meal: WorkingMeal,
  familyId: FamilyId,
  fn: (fam: WorkingFamily) => WorkingFamily,
): WorkingMeal {
  return {
    ...meal,
    families: meal.families.map((fam) => (fam.familyId === familyId ? fn(fam) : fam)),
  };
}

function familyFor(meal: WorkingMeal, familyId: FamilyId): WorkingFamily | undefined {
  return meal.families.find((f) => f.familyId === familyId);
}

/** Ensure the family exists; add it if not. */
function ensureFamily(meal: WorkingMeal, familyId: FamilyId): WorkingMeal {
  if (familyFor(meal, familyId)) return meal;
  return { ...meal, families: [...meal.families, { familyId, foods: [] }] };
}

/** Ensure the food exists in the family; add it as idle if not. */
function ensureFood(
  meal: WorkingMeal,
  familyId: FamilyId,
  foodId: string,
  name: string,
): WorkingMeal {
  const fam = familyFor(meal, familyId);
  if (fam?.foods.some((f) => f.foodId === foodId)) return meal;
  const withFamily = ensureFamily(meal, familyId);
  return mapFamily(withFamily, familyId, (fam) => ({
    ...fam,
    foods: [...fam.foods, { foodId, name, state: { status: 'idle' } }],
  }));
}

function isActive(state: FoodEditState): boolean {
  return state.status === 'editing' || state.status === 'confirmed';
}

// ── State machine transitions ─────────────────────────────────

/**
 * Tap an idle or confirmed food: put it in editing, lock everything else.
 * If the food has cached amount/prep from a prior confirmed state, restore them.
 */
export function startEditing(
  meal: WorkingMeal,
  familyId: FamilyId,
  foodId: string,
  name: string,
): WorkingMeal {
  const withFood = ensureFood(meal, familyId, foodId, name);
  return mapFamily(withFood, familyId, (fam) => ({
    ...fam,
    foods: fam.foods.map((f) => {
      if (f.foodId === foodId) {
        const amount: PortionKind = f.cachedAmount ?? 'portion';
        const preparation = f.cachedPreparation;
        return { ...f, state: { status: 'editing', amount, preparation } };
      }
      if (
        f.state.status === 'idle' ||
        f.state.status === 'editing' ||
        f.state.status === 'confirmed'
      )
        return {
          ...f,
          state: { status: 'locked', prior: f.state.status === 'confirmed' ? 'confirmed' : 'idle' },
        };
      return f;
    }),
  }));
}

/**
 * "Uložit {Food}": confirm the editing food, unlock everything else.
 * Locked foods are restored to their prior state (confirmed or idle).
 */
export function confirmFood(meal: WorkingMeal, familyId: FamilyId, foodId: string): WorkingMeal {
  return mapFamily(meal, familyId, (fam) => ({
    ...fam,
    foods: fam.foods.map((f) => {
      if (f.foodId === foodId && f.state.status === 'editing') {
        const { amount, preparation } = f.state;
        return {
          ...f,
          state: { status: 'confirmed', amount, preparation },
          cachedAmount: amount,
          cachedPreparation: preparation,
        };
      }
      if (f.state.status === 'locked') {
        return f.state.prior === 'confirmed' && f.cachedAmount
          ? {
              ...f,
              state: {
                status: 'confirmed',
                amount: f.cachedAmount,
                preparation: f.cachedPreparation,
              },
            }
          : { ...f, state: { status: 'idle' } };
      }
      return f;
    }),
  }));
}

/**
 * Tap the editing food again (or tap outside): cancel back to idle, cache nothing.
 * Locked foods are restored to their prior state (confirmed or idle).
 */
export function cancelEditing(meal: WorkingMeal, familyId: FamilyId, foodId: string): WorkingMeal {
  return mapFamily(meal, familyId, (fam) => ({
    ...fam,
    foods: fam.foods.map((f) => {
      if (f.foodId === foodId && f.state.status === 'editing') {
        return { ...f, state: { status: 'idle' } };
      }
      if (f.state.status === 'locked') {
        return f.state.prior === 'confirmed' && f.cachedAmount
          ? {
              ...f,
              state: {
                status: 'confirmed',
                amount: f.cachedAmount,
                preparation: f.cachedPreparation,
              },
            }
          : { ...f, state: { status: 'idle' } };
      }
      return f;
    }),
  }));
}

/**
 * Tap a confirmed food: deselect it back to idle. Cache is preserved for re-select.
 */
export function deselectFood(meal: WorkingMeal, familyId: FamilyId, foodId: string): WorkingMeal {
  return mapFood(meal, familyId, foodId, (f) => {
    if (f.state.status !== 'confirmed') return f;
    return { ...f, state: { status: 'idle' } };
  });
}

/**
 * Update amount while a food is in editing state.
 */
export function updateEditingAmount(
  meal: WorkingMeal,
  familyId: FamilyId,
  foodId: string,
  amount: PortionKind,
): WorkingMeal {
  return mapFood(meal, familyId, foodId, (f) => {
    if (f.state.status !== 'editing') return f;
    return { ...f, state: { ...f.state, amount } };
  });
}

/**
 * Update preparation method while a food is in editing state.
 */
export function updateEditingPreparation(
  meal: WorkingMeal,
  familyId: FamilyId,
  foodId: string,
  preparation: PreparationMethod | undefined,
): WorkingMeal {
  return mapFood(meal, familyId, foodId, (f) => {
    if (f.state.status !== 'editing') return f;
    return { ...f, state: { ...f.state, preparation } };
  });
}

/**
 * Remove a food from the working list entirely (the ✕ action on a grid row).
 * If the removed food was editing, locked siblings are restored to their prior state.
 */
export function removeFood(meal: WorkingMeal, familyId: FamilyId, foodId: string): WorkingMeal {
  return mapFamily(meal, familyId, (fam) => {
    const target = fam.foods.find((f) => f.foodId === foodId);
    const wasEditing = target?.state.status === 'editing';
    return {
      ...fam,
      foods: fam.foods
        .filter((f) => f.foodId !== foodId)
        .map((f) => {
          if (!wasEditing || f.state.status !== 'locked') return f;
          return f.state.prior === 'confirmed' && f.cachedAmount
            ? {
                ...f,
                state: {
                  status: 'confirmed',
                  amount: f.cachedAmount,
                  preparation: f.cachedPreparation,
                },
              }
            : { ...f, state: { status: 'idle' } };
        }),
    };
  });
}

/**
 * "Uložit {Family}": remove all non-confirmed foods from the family,
 * reset confirmed foods' caches so the slot is clean for a future edit.
 */
export function commitFamily(meal: WorkingMeal, familyId: FamilyId): WorkingMeal {
  return mapFamily(meal, familyId, (fam) => ({
    ...fam,
    foods: fam.foods.filter((f) => isActive(f.state)),
  }));
}

// ── Read helpers ───────────────────────────────────────────────

export function confirmedFoodsForFamily(meal: WorkingMeal, familyId: FamilyId): WorkingFood[] {
  return familyFor(meal, familyId)?.foods.filter((f) => f.state.status === 'confirmed') ?? [];
}

export function allConfirmedFoods(meal: WorkingMeal): WorkingFood[] {
  return meal.families.flatMap((fam) => fam.foods.filter((f) => f.state.status === 'confirmed'));
}

export function editingFood(meal: WorkingMeal, familyId: FamilyId): WorkingFood | null {
  return familyFor(meal, familyId)?.foods.find((f) => f.state.status === 'editing') ?? null;
}

export function foodsForFamily(meal: WorkingMeal, familyId: FamilyId): WorkingFood[] {
  return familyFor(meal, familyId)?.foods ?? [];
}

/**
 * Convert the working meal's confirmed foods to MealItem[] for persistence.
 */
export function toMealItems(meal: WorkingMeal): MealItem[] {
  return allConfirmedFoods(meal).map((f) => {
    if (f.state.status !== 'confirmed') {
      throw new Error(`toMealItems: food ${f.foodId} is not confirmed`);
    }
    return {
      id: randomUUID(),
      name: f.name,
      foodId: f.foodId as MealItem['foodId'],
      amount: f.state.amount,
      preparationMethod: f.state.preparation,
    };
  });
}

/**
 * True when the working meal has at least one food in an active state
 * (editing or confirmed). Used by the discard guard before navigating away.
 */
export function isNonEmpty(meal: WorkingMeal): boolean {
  return meal.families.some((fam) =>
    fam.foods.some((f) => f.state.status === 'editing' || f.state.status === 'confirmed'),
  );
}

/**
 * Reconstruct a WorkingMeal from a persisted Meal's items, with all foods in
 * confirmed state. Used when loading an existing meal slot for editing.
 *
 * Every `FoodId` is a catalog id (issue #662), so an item whose food is absent
 * from `FOODS` is a stale persisted row, not a custom food. It is dropped rather
 * than bucketed into an invented family — there is no family to put it in.
 *
 * The drop is silent because it is unreachable, not because the case is benign:
 * Dexie v12 cleared the only rows that could carry a non-catalog id, and the
 * narrowed `FoodId` stops new ones being written. If this ever drops an item in
 * practice, something upstream is writing unvalidated ids and *that* is the bug —
 * this function is the wrong place to raise it (pure domain, no logging surface).
 */
export function fromMealItems(items: MealItem[], notes = ''): WorkingMeal {
  const familyMap = new Map<FamilyId, WorkingFood[]>();

  for (const item of items) {
    const catalogFood = FOODS.find((f) => f.id === item.foodId);
    if (!catalogFood) continue;
    const familyId: FamilyId = catalogFood.familyId;

    const food: WorkingFood = {
      foodId: item.foodId,
      name: item.name,
      state: { status: 'confirmed', amount: item.amount, preparation: item.preparationMethod },
      cachedAmount: item.amount,
      cachedPreparation: item.preparationMethod,
    };

    const existing = familyMap.get(familyId);
    if (existing) {
      existing.push(food);
    } else {
      familyMap.set(familyId, [food]);
    }
  }

  return {
    families: [...familyMap.entries()].map(([familyId, foods]) => ({ familyId, foods })),
    notes,
  };
}

/**
 * Assemble a persistable `Meal` from a working meal + slot + notes, enforcing
 * the createdAt/updatedAt rule from ADR-0018: a compose-new write mints a
 * fresh `createdAt` and omits `updatedAt`; an edit-update preserves the loaded
 * `createdAt` and stamps `updatedAt`. Returns `null` when the working meal
 * has no confirmed items (empty-meal no-op).
 */
export function finalizeWorkingMeal(
  slot: MealSlot,
  meal: WorkingMeal,
  notes: string,
  loadedCreatedAt: string | null,
  now: string = new Date().toISOString(),
): Meal | null {
  const items = toMealItems(meal);
  if (items.length === 0) return null;
  const trimmedNotes = notes.trim();
  return {
    id: mealId(slot.date, slot.mealType, slot.actor),
    date: slot.date,
    mealType: slot.mealType,
    actor: slot.actor,
    items,
    notes: trimmedNotes || undefined,
    createdAt: loadedCreatedAt ?? now,
    ...(loadedCreatedAt !== null ? { updatedAt: now } : {}),
  };
}

/** Result of a copy: the persistable destination `Meal`, or `null` for a no-op. */
export type CopyMealResult = {
  meal: Meal | null;
  added: MealItem[];
};

/** Copy a MealItem verbatim with a freshly minted id. */
function withFreshItemId(item: MealItem): MealItem {
  return {
    id: randomUUID(),
    name: item.name,
    foodId: item.foodId,
    amount: item.amount,
    preparationMethod: item.preparationMethod,
  };
}

/**
 * Pure heart of the copy-meal feature: assemble the persistable destination
 * `Meal` from a source meal copied into a destination slot. The source note
 * never travels. `target` is the meal currently occupying the destination slot,
 * or `null` when the slot is empty.
 *
 * - Empty destination → compose-new: fresh `MealId`, all source items carried
 *   with fresh ids, no note, fresh `createdAt`, no `updatedAt`.
 * - Occupied destination → additive merge keyed by `foodId`: only foods the
 *   destination lacks are added; the destination always wins on collision;
 *   destination `createdAt` + `notes` preserved, `updatedAt` stamped.
 * - No-op (`meal: null`, `added: []`) when the merge would add nothing —
 *   covers self-copy and full overlap.
 */
export function copyMealInto(
  source: Meal,
  target: Meal | null,
  targetSlot: MealSlot,
  now: string = new Date().toISOString(),
): CopyMealResult {
  if (target === null) {
    const items = source.items.map(withFreshItemId);
    return {
      meal: {
        id: mealId(targetSlot.date, targetSlot.mealType, targetSlot.actor),
        date: targetSlot.date,
        mealType: targetSlot.mealType,
        actor: targetSlot.actor,
        items,
        notes: undefined,
        createdAt: now,
      },
      added: items,
    };
  }

  const existingFoodIds = new Set(target.items.map((i) => i.foodId));
  const added = source.items.filter((i) => !existingFoodIds.has(i.foodId)).map(withFreshItemId);
  if (added.length === 0) return { meal: null, added: [] };

  return {
    meal: { ...target, items: [...target.items, ...added], updatedAt: now },
    added,
  };
}
