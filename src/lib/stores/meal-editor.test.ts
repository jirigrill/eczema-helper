import { describe, expect, it } from 'vitest';

import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { OUT_OF_WINDOW_ERROR } from '$lib/adapters/loggable-window-guard';
import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import { makeSchedule } from '$lib/domain/__fixtures__/schedule';
import type { Meal } from '$lib/domain/models';
import {
  confirmFood,
  deselectFood,
  removeFood,
  startEditing,
  updateEditingAmount,
  updateEditingPreparation,
} from '$lib/domain/working-meal';

import { createMealEditor } from './meal-editor.svelte';

const meals = new DexieMealRepository(db, new DexieScheduleRepository(db));

const today = '2024-08-01';

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: `${today}:lunch:mother`,
    date: today,
    mealType: 'lunch',
    actor: 'mother',
    items: [
      {
        id: 'item-1',
        name: 'Brambory',
        foodId: 'brambory',
        amount: 'portion',
      },
    ],
    notes: 'breakfast notes',
    createdAt: '2024-08-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('createMealEditor — open()', () => {
  it('on a fresh slot starts in compose framing with empty working meal', async () => {
    const editor = createMealEditor();
    await editor.open({ date: today, mealType: 'lunch', actor: 'mother' });

    expect(editor.editingExisting).toBe(false);
    expect(editor.confirmedFoods).toEqual([]);
    expect(editor.workingMeal.notes).toBe('');
    expect(editor.loadedCreatedAt).toBeNull();
  });

  it('on a saved slot hydrates into a WorkingMeal in edit framing', async () => {
    const date = '2024-08-02';
    const seeded = makeMeal({ id: `${date}:dinner:mother`, date, mealType: 'dinner' });
    await meals.save(seeded);

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'dinner', actor: 'mother' });

    expect(editor.editingExisting).toBe(true);
    expect(editor.workingMeal.notes).toBe('breakfast notes');
    expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
    expect(editor.loadedCreatedAt).toBe('2024-08-01T08:00:00.000Z');
  });
});

describe('createMealEditor — update(fn)', () => {
  it('threads working-meal transitions; confirmed food becomes visible via confirmedFoods', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-08-03', mealType: 'breakfast', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
  });
});

describe('createMealEditor — finalize() compose-new', () => {
  it('persists with a fresh createdAt and no updatedAt', async () => {
    const date = '2024-08-04';
    const before = new Date().toISOString();
    const editor = createMealEditor();
    await editor.open({ date, mealType: 'snack', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    const result = await editor.finalize({ notes: 'snack notes' });
    expect(result).toMatchObject({ ok: true });

    const reload = await meals.loadBySlot(date, 'snack', 'mother');
    if (!reload.ok || !reload.data) throw new Error('expected reload to succeed');
    expect(reload.data.createdAt >= before).toBe(true);
    expect(reload.data.updatedAt).toBeUndefined();
    expect(reload.data.notes).toBe('snack notes');
  });
});

describe('createMealEditor — finalize() on edit', () => {
  it('preserves the original createdAt and stamps a fresh updatedAt', async () => {
    const date = '2024-08-05';
    const originalCreatedAt = '2024-08-05T07:00:00.000Z';
    await meals.save(
      makeMeal({
        id: `${date}:lunch:mother`,
        date,
        mealType: 'lunch',
        createdAt: originalCreatedAt,
      }),
    );

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    // Mutate something so toMealItems is non-empty (re-confirms current items).
    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    const before = new Date().toISOString();
    const result = await editor.finalize({ notes: 'edited' });
    expect(result).toMatchObject({ ok: true });

    const reload = await meals.loadBySlot(date, 'lunch', 'mother');
    if (!reload.ok || !reload.data) throw new Error('expected reload to succeed');
    expect(reload.data.createdAt).toBe(originalCreatedAt);
    expect(reload.data.updatedAt).toBeDefined();
    expect(reload.data.updatedAt! >= before).toBe(true);
  });
});

describe('createMealEditor — dirty + canFinalize on edit', () => {
  it('clean edit (no mutation after open) is not dirty and canFinalize is false', async () => {
    const date = '2024-09-01';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    expect(editor.dirty).toBe(false);
    expect(editor.canFinalize).toBe(false);
  });

  it('changing a food (deselect + add a different food) flips dirty true and canFinalize true', async () => {
    const date = '2024-09-02';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    editor.update((m) => deselectFood(m, 'vegetables', 'brambory'));
    editor.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor.update((m) => confirmFood(m, 'vegetables', 'mrkev'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('changing a food amount flips dirty true', async () => {
    const date = '2024-09-03';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    // Re-enter editing on the seeded food, change amount, re-confirm.
    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => updateEditingAmount(m, 'vegetables', 'brambory', 'spoon'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('changing a food preparation flips dirty true', async () => {
    const date = '2024-09-04';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => updateEditingPreparation(m, 'vegetables', 'brambory', 'boiled'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
  });

  it('changing notes flips dirty true; whitespace-only padding stays clean (trim-aware)', async () => {
    const date = '2024-09-05';
    await meals.save(
      makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch', notes: 'orig' }),
    );

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    expect(editor.notes).toBe('orig');
    expect(editor.dirty).toBe(false);

    // Whitespace padding doesn't dirty.
    editor.notes = '  orig  ';
    expect(editor.dirty).toBe(false);

    // Real change does.
    editor.notes = 'changed';
    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('emptying a saved meal (remove every food) is dirty but canFinalize is false (issue #586)', async () => {
    // An empty meal is not a valid persisted state — finalize() is a silent
    // no-op that restores the old foods. canFinalize must stay false so the
    // save CTA disables and the empty-meal hint routes to "Smazat jídlo".
    const date = '2024-09-06';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    editor.update((m) => removeFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(false);
  });
});

describe('createMealEditor — dirty + canFinalize on compose-new', () => {
  it('compose-new with no confirmed foods is not dirty and canFinalize is false', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-10', mealType: 'breakfast', actor: 'mother' });

    expect(editor.dirty).toBe(false);
    expect(editor.canFinalize).toBe(false);
  });

  it('compose-new with any confirmed food is dirty and canFinalize is true', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-11', mealType: 'breakfast', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('compose-new with only an editing food (not yet confirmed) is dirty (isNonEmpty rule)', async () => {
    // Mirrors the route's pre-extraction rule: an editing food makes a
    // compose-new dirty even before the user confirms.
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-12', mealType: 'breakfast', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));

    expect(editor.dirty).toBe(true);
    // canFinalize still requires a *confirmed* food (toMealItems would throw
    // otherwise); editing-only can't be persisted yet.
    expect(editor.canFinalize).toBe(false);
  });
});

describe('createMealEditor — finalizeKind', () => {
  it('returns "compose" on a fresh slot, "edit" on a saved slot', async () => {
    const date = '2024-09-20';
    const editor = createMealEditor();

    await editor.open({ date, mealType: 'breakfast', actor: 'mother' });
    expect(editor.finalizeKind).toBe('compose');

    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });
    expect(editor.finalizeKind).toBe('edit');
  });
});

describe('createMealEditor — discardDescriptor()', () => {
  it('compose-new with no confirmed foods returns null (nothing to discard)', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-10-01', mealType: 'breakfast', actor: 'mother' });

    expect(editor.discardDescriptor()).toBeNull();
  });

  it('compose-new with a confirmed food returns kind "compose" + working meal carrying live notes', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-10-02', mealType: 'breakfast', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));
    editor.notes = 'compose draft notes';

    const desc = editor.discardDescriptor();
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('meal-compose');
    expect(desc!.workingMeal.notes).toBe('compose draft notes');
    expect(desc!.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId))).toEqual([
      'brambory',
    ]);
  });

  it('clean edit returns null (load snapshot equals live)', async () => {
    const date = '2024-10-03';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    expect(editor.discardDescriptor()).toBeNull();
  });

  it('dirty edit returns kind "edit" + working meal carrying live notes', async () => {
    const date = '2024-10-04';
    await meals.save(
      makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch', notes: 'orig' }),
    );

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    editor.notes = 'changed mid-edit';

    const desc = editor.discardDescriptor();
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('meal-edit');
    expect(desc!.workingMeal.notes).toBe('changed mid-edit');
  });

  it('discardDescriptor("delete") returns kind "delete" with the current working meal (regardless of dirtiness)', async () => {
    // Delete is an explicit user action; the editor can't infer it from its own
    // state. The route calls discardDescriptor('delete') after the row is gone
    // from Dexie, threading the captured working meal into the buffer.
    const date = '2024-10-05';
    await meals.save(
      makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch', notes: 'will be removed' }),
    );

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    const desc = editor.discardDescriptor('delete');
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('meal-delete');
    expect(desc!.workingMeal.notes).toBe('will be removed');
    expect(desc!.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId))).toEqual([
      'brambory',
    ]);
  });
});

describe('createMealEditor — applyUndo()', () => {
  it('after applyUndo(buffer with kind="edit") rehydrates state as DIRTY (load snapshot is the persisted row, not the rehydrated dirty state)', async () => {
    // Simulates the round-trip: open existing meal, dirty it, navigate away
    // (writes buffer), navigate back (mounts a fresh editor), call applyUndo.
    // The restored edit must read as dirty so a second back-out re-buffers
    // rather than silently dropping the user's restored work (issue #299).
    const date = '2024-10-06';
    const originalCreatedAt = '2024-10-06T07:00:00.000Z';
    await meals.save(
      makeMeal({
        id: `${date}:lunch:mother`,
        date,
        mealType: 'lunch',
        createdAt: originalCreatedAt,
      }),
    );

    // First editor: simulates the screen the user dirties before navigating away.
    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'lunch', actor: 'mother' });
    editor1.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor1.update((m) => confirmFood(m, 'vegetables', 'mrkev'));
    editor1.notes = 'dirty edit notes';
    const desc = editor1.discardDescriptor();
    expect(desc?.kind).toBe('meal-edit');

    // Fresh editor (page remounted on undo navigation): apply the buffer.
    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'lunch', actor: 'mother' },
      {
        kind: 'meal-edit',
        workingMeal: desc!.workingMeal,
        mealType: 'lunch',
        date,
        returnTo: '/day/2024-10-06',
      },
    );

    expect(editor2.finalizeKind).toBe('edit');
    expect(editor2.dirty).toBe(true);
    expect(editor2.canFinalize).toBe(true);
    expect(editor2.notes).toBe('dirty edit notes');
    expect(editor2.confirmedFoods.map((f) => f.foodId).sort()).toEqual(['brambory', 'mrkev']);
    expect(editor2.loadedCreatedAt).toBe(originalCreatedAt);
  });

  it('after applyUndo with eliminatedToday, conflict context is re-injected (eliminatedFoodIds + hasConflicts)', async () => {
    // Issue #299: undo must re-inject the elimination window so the per-food
    // danger styling and red CTA reappear on the rehydrated screen.
    const date = '2024-11-10';
    // Seed a saved meal with a single non-eliminated food.
    await meals.save(
      makeMeal({
        id: `${date}:breakfast:mother`,
        date,
        mealType: 'breakfast',
        items: [{ id: 'item-1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      }),
    );

    // Simulate user adding an eliminated dairy food, backing out, capturing buffer.
    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'breakfast', actor: 'mother' }, ['dairy']);
    editor1.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));
    editor1.update((m) => confirmFood(m, 'dairy', 'kravske-mleko'));
    expect(editor1.hasConflicts).toBe(true);
    const desc = editor1.discardDescriptor();
    expect(desc?.kind).toBe('meal-edit');

    // Fresh editor on undo navigation: applyUndo with eliminatedToday.
    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'breakfast', actor: 'mother' },
      {
        kind: 'meal-edit',
        workingMeal: desc!.workingMeal,
        mealType: 'breakfast',
        date,
        returnTo: `/day/${date}`,
      },
      ['dairy'],
    );

    expect(editor2.eliminatedFoodIds.has('kravske-mleko')).toBe(true);
    expect(editor2.hasConflicts).toBe(true);
  });

  it('after applyUndo, a second back-out yields a fresh discard descriptor (no silent loss of restored food)', async () => {
    // Issue #299: undo restores dirty state, so backing out again must
    // re-write the buffer rather than treat the meal as clean.
    const date = '2024-11-11';
    await meals.save(makeMeal({ id: `${date}:lunch:mother`, date, mealType: 'lunch' }));

    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'lunch', actor: 'mother' });
    editor1.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor1.update((m) => confirmFood(m, 'vegetables', 'mrkev'));
    const desc = editor1.discardDescriptor()!;

    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'lunch', actor: 'mother' },
      {
        kind: 'meal-edit',
        workingMeal: desc.workingMeal,
        mealType: 'lunch',
        date,
        returnTo: `/day/${date}`,
      },
    );

    // Second back-out: editor must report a non-null descriptor with the
    // restored mrkev still in the working meal.
    const desc2 = editor2.discardDescriptor();
    expect(desc2).not.toBeNull();
    expect(desc2!.kind).toBe('meal-edit');
    expect(
      desc2!.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId)).sort(),
    ).toEqual(['brambory', 'mrkev']);
  });

  it('back-out → undo → finalize round-trip preserves the original createdAt', async () => {
    const date = '2024-10-07';
    const originalCreatedAt = '2024-10-07T06:00:00.000Z';
    await meals.save(
      makeMeal({
        id: `${date}:lunch:mother`,
        date,
        mealType: 'lunch',
        createdAt: originalCreatedAt,
      }),
    );

    // Editor 1: dirty + capture descriptor.
    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'lunch', actor: 'mother' });
    editor1.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor1.update((m) => confirmFood(m, 'vegetables', 'mrkev'));
    const desc = editor1.discardDescriptor()!;

    // Editor 2: undo + finalize.
    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'lunch', actor: 'mother' },
      {
        kind: desc.kind,
        workingMeal: desc.workingMeal,
        mealType: 'lunch',
        date,
        returnTo: '/day/x',
      },
    );
    const result = await editor2.finalize();
    expect(result).toMatchObject({ ok: true });

    const reload = await meals.loadBySlot(date, 'lunch', 'mother');
    if (!reload.ok || !reload.data) throw new Error('expected reload to succeed');
    expect(reload.data.createdAt).toBe(originalCreatedAt);
    expect(reload.data.updatedAt).toBeDefined();
  });

  it('after applyUndo(buffer with kind="delete") finalize-state is compose-new (next save mints fresh createdAt)', async () => {
    const date = '2024-10-08';
    const editor = createMealEditor();

    await editor.applyUndo(
      { date, mealType: 'lunch', actor: 'mother' },
      {
        kind: 'meal-delete',
        workingMeal: {
          notes: 'restored',
          families: [
            {
              familyId: 'vegetables',
              foods: [
                {
                  foodId: 'brambory',
                  name: 'Brambory',
                  state: { status: 'confirmed', amount: 'portion' },
                  cachedAmount: 'portion',
                },
              ],
            },
          ],
        },
        mealType: 'lunch',
        date,
        returnTo: '/day/x',
      },
    );

    expect(editor.finalizeKind).toBe('compose');
    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
    expect(editor.notes).toBe('restored');
    expect(editor.loadedCreatedAt).toBeNull();
  });

  it('after applyUndo(buffer with kind="compose") finalize-state is compose-new and canFinalize is true (restored confirmed food)', async () => {
    // Issue #299: compose-new undo must leave canFinalize true so the user
    // can save the restored draft.
    const date = '2024-10-09';
    const editor = createMealEditor();

    await editor.applyUndo(
      { date, mealType: 'breakfast', actor: 'mother' },
      {
        kind: 'meal-compose',
        workingMeal: {
          notes: 'draft',
          families: [
            {
              familyId: 'vegetables',
              foods: [
                {
                  foodId: 'brambory',
                  name: 'Brambory',
                  state: { status: 'confirmed', amount: 'portion' },
                  cachedAmount: 'portion',
                },
              ],
            },
          ],
        },
        mealType: 'breakfast',
        date,
        returnTo: '/day/x',
      },
    );

    expect(editor.finalizeKind).toBe('compose');
    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
    expect(editor.notes).toBe('draft');
    expect(editor.loadedCreatedAt).toBeNull();
  });
});

describe('createMealEditor — order-independent food comparison', () => {
  it('reordering confirmed foods (deselect then re-add) leaves the edit clean', async () => {
    // Seed two foods and verify that deselecting one and re-adding it (which
    // appends to the working list) does not flip dirty.
    const date = '2024-09-13';
    await meals.save({
      id: `${date}:lunch:mother`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [
        { id: 'a', name: 'Brambory', foodId: 'brambory', amount: 'portion' },
        { id: 'b', name: 'Mrkev', foodId: 'mrkev', amount: 'portion' },
      ],
      createdAt: '2024-09-13T08:00:00.000Z',
    });

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });
    expect(editor.dirty).toBe(false);

    // Reorder: drop brambory then re-add it after mrkev — same set, different order.
    editor.update((m) => deselectFood(m, 'vegetables', 'brambory'));
    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(false);
  });
});

describe('createMealEditor — finalize() empty no-op', () => {
  it('returns ok without persisting when the working meal has no confirmed foods', async () => {
    const date = '2024-08-06';
    const editor = createMealEditor();
    await editor.open({ date, mealType: 'breakfast', actor: 'mother' });

    const result = await editor.finalize();
    expect(result).toMatchObject({ ok: true });

    const reload = await meals.loadBySlot(date, 'breakfast', 'mother');
    expect(reload).toMatchObject({ ok: true, data: null });
  });
});

describe('createMealEditor — eliminatedFoodIds + hasConflicts', () => {
  it('with eliminatedToday=["dairy"], confirming a dairy food puts its id in eliminatedFoodIds and sets hasConflicts', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-01', mealType: 'breakfast', actor: 'mother' }, ['dairy']);

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));
    editor.update((m) => confirmFood(m, 'dairy', 'kravske-mleko'));

    expect(editor.eliminatedFoodIds).toEqual(new Set(['kravske-mleko']));
    expect(editor.hasConflicts).toBe(true);
  });

  it('with no eliminatedToday provided, eliminatedFoodIds is empty and hasConflicts is false even with foods confirmed', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-02', mealType: 'breakfast', actor: 'mother' });

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));
    editor.update((m) => confirmFood(m, 'dairy', 'kravske-mleko'));

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);
  });

  it('with eliminatedToday=["dairy"], a non-dairy food does not appear in eliminatedFoodIds', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-03', mealType: 'breakfast', actor: 'mother' }, ['dairy']);

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);
  });

  it('eliminatedFoodIds includes a food that is still in editing (not yet confirmed)', async () => {
    // Mirrors the route's per-row danger styling: an editing food that touches
    // an eliminated allergen must be flagged before the user confirms.
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-04', mealType: 'breakfast', actor: 'mother' }, ['dairy']);

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));

    expect(editor.eliminatedFoodIds.has('kravske-mleko')).toBe(true);
    expect(editor.hasConflicts).toBe(true);
  });
});

describe('createMealEditor — swapActor()', () => {
  it('autosaves the departing actor (confirmed foods + notes) and reloads the target slot', async () => {
    const date = '2025-01-10';
    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));
    editor.notes = 'maminka jedla brambory';

    await editor.swapActor({ date, mealType: 'lunch', actor: 'baby' });

    // Target reloaded: baby slot is empty, so editor is in fresh compose framing.
    expect(editor.editingExisting).toBe(false);
    expect(editor.confirmedFoods).toEqual([]);
    expect(editor.notes).toBe('');

    // Departing (mother) slot was autosaved — visible by swapping back.
    await editor.swapActor({ date, mealType: 'lunch', actor: 'mother' });
    expect(editor.editingExisting).toBe(true);
    expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
    expect(editor.notes).toBe('maminka jedla brambory');
  });

  it('drops an in-editing (drilled-in, unconfirmed) food from the departing autosave', async () => {
    const date = '2025-01-11';
    const editor = createMealEditor();
    await editor.open({ date, mealType: 'dinner', actor: 'mother' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));
    // A second food left drilled-in (editing), never confirmed.
    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));

    await editor.swapActor({ date, mealType: 'dinner', actor: 'baby' });
    await editor.swapActor({ date, mealType: 'dinner', actor: 'mother' });

    // Only the confirmed food survived; the editing one was dropped.
    expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
  });

  it('no-ops when the departing meal is empty — nothing is persisted, target still reloads', async () => {
    const date = '2025-01-12';
    const editor = createMealEditor();
    await editor.open({ date, mealType: 'breakfast', actor: 'mother' });

    const result = await editor.swapActor({ date, mealType: 'breakfast', actor: 'baby' });

    expect(result).toMatchObject({ ok: true });
    // Target reloaded into fresh compose framing.
    expect(editor.editingExisting).toBe(false);

    // Nothing was written for the empty mother slot: swapping back stays compose.
    await editor.swapActor({ date, mealType: 'breakfast', actor: 'mother' });
    expect(editor.editingExisting).toBe(false);
    expect(editor.confirmedFoods).toEqual([]);
  });

  it('aborts on finalize failure: current actor stays active, working meal preserved, error returned', async () => {
    // A schedule makes the loggable-window guard reject an out-of-window write,
    // giving a genuine `save` failure through the real repository — no mocks.
    await db.schedule.put({ id: SINGLETON_ID, ...makeSchedule() });
    try {
      const outOfWindow = '2024-01-01';
      const editor = createMealEditor();
      await editor.open({ date: outOfWindow, mealType: 'lunch', actor: 'mother' });

      editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
      editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));
      editor.notes = 'nezmizí';

      const result = await editor.swapActor({
        date: outOfWindow,
        mealType: 'lunch',
        actor: 'baby',
      });

      // Swap aborted: the failing Result surfaces for the CTA error path.
      expect(result).toEqual({ ok: false, error: OUT_OF_WINDOW_ERROR });
      // Current (mother) actor stays active with its working meal intact.
      expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
      expect(editor.notes).toBe('nezmizí');
    } finally {
      await db.schedule.clear();
    }
  });
});
