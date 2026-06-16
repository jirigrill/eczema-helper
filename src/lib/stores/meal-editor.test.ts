import { describe, it, expect } from 'vitest';
import { createMealEditor } from './meal-editor.svelte';
import { createMealSession } from './meal-session';
import {
  startEditing,
  confirmFood,
  deselectFood,
  updateEditingAmount,
  updateEditingPreparation,
} from '$lib/domain/working-meal';
import type { Meal } from '$lib/domain/models';

const today = '2024-08-01';

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: `${today}:lunch`,
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
    await editor.open({ date: today, mealType: 'lunch' });

    expect(editor.editingExisting).toBe(false);
    expect(editor.confirmedFoods).toEqual([]);
    expect(editor.workingMeal.notes).toBe('');
    expect(editor.loadedCreatedAt).toBeNull();
  });

  it('on a saved slot hydrates into a WorkingMeal in edit framing', async () => {
    const date = '2024-08-02';
    const session = createMealSession(date);
    const seeded = makeMeal({ id: `${date}:dinner`, date, mealType: 'dinner' });
    await session.save(seeded);

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'dinner' });

    expect(editor.editingExisting).toBe(true);
    expect(editor.workingMeal.notes).toBe('breakfast notes');
    expect(editor.confirmedFoods.map((f) => f.foodId)).toEqual(['brambory']);
    expect(editor.loadedCreatedAt).toBe('2024-08-01T08:00:00.000Z');
  });
});

describe('createMealEditor — update(fn)', () => {
  it('threads working-meal transitions; confirmed food becomes visible via confirmedFoods', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-08-03', mealType: 'breakfast' });

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
    await editor.open({ date, mealType: 'snack' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    const result = await editor.finalize({ notes: 'snack notes' });
    expect(result).toMatchObject({ ok: true });

    const reload = await createMealSession(date).loadBySlot(date, 'snack');
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
    const session = createMealSession(date);
    await session.save(makeMeal({
      id: `${date}:lunch`,
      date,
      mealType: 'lunch',
      createdAt: originalCreatedAt,
    }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    // Mutate something so toMealItems is non-empty (re-confirms current items).
    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    const before = new Date().toISOString();
    const result = await editor.finalize({ notes: 'edited' });
    expect(result).toMatchObject({ ok: true });

    const reload = await createMealSession(date).loadBySlot(date, 'lunch');
    if (!reload.ok || !reload.data) throw new Error('expected reload to succeed');
    expect(reload.data.createdAt).toBe(originalCreatedAt);
    expect(reload.data.updatedAt).toBeDefined();
    expect(reload.data.updatedAt! >= before).toBe(true);
  });
});

describe('createMealEditor — dirty + canFinalize on edit', () => {
  it('clean edit (no mutation after open) is not dirty and canFinalize is false', async () => {
    const date = '2024-09-01';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    expect(editor.dirty).toBe(false);
    expect(editor.canFinalize).toBe(false);
  });

  it('changing a food (deselect + add a different food) flips dirty true and canFinalize true', async () => {
    const date = '2024-09-02';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    editor.update((m) => deselectFood(m, 'vegetables', 'brambory'));
    editor.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor.update((m) => confirmFood(m, 'vegetables', 'mrkev'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('changing a food amount flips dirty true', async () => {
    const date = '2024-09-03';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    // Re-enter editing on the seeded food, change amount, re-confirm.
    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => updateEditingAmount(m, 'vegetables', 'brambory', 'spoon'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('changing a food preparation flips dirty true', async () => {
    const date = '2024-09-04';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => updateEditingPreparation(m, 'vegetables', 'brambory', 'boiled'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
  });

  it('changing notes flips dirty true; whitespace-only padding stays clean (trim-aware)', async () => {
    const date = '2024-09-05';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch', notes: 'orig' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

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
});

describe('createMealEditor — dirty + canFinalize on compose-new', () => {
  it('compose-new with no confirmed foods is not dirty and canFinalize is false', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-10', mealType: 'breakfast' });

    expect(editor.dirty).toBe(false);
    expect(editor.canFinalize).toBe(false);
  });

  it('compose-new with any confirmed food is dirty and canFinalize is true', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-11', mealType: 'breakfast' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
  });

  it('compose-new with only an editing food (not yet confirmed) is dirty (isNonEmpty rule)', async () => {
    // Mirrors the route's pre-extraction rule: an editing food makes a
    // compose-new dirty even before the user confirms.
    const editor = createMealEditor();
    await editor.open({ date: '2024-09-12', mealType: 'breakfast' });

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

    await editor.open({ date, mealType: 'breakfast' });
    expect(editor.finalizeKind).toBe('compose');

    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));
    await editor.open({ date, mealType: 'lunch' });
    expect(editor.finalizeKind).toBe('edit');
  });
});

describe('createMealEditor — discardDescriptor()', () => {
  it('compose-new with no confirmed foods returns null (nothing to discard)', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-10-01', mealType: 'breakfast' });

    expect(editor.discardDescriptor()).toBeNull();
  });

  it('compose-new with a confirmed food returns kind "compose" + working meal carrying live notes', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-10-02', mealType: 'breakfast' });

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));
    editor.notes = 'compose draft notes';

    const desc = editor.discardDescriptor();
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('compose');
    expect(desc!.workingMeal.notes).toBe('compose draft notes');
    expect(desc!.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId))).toEqual([
      'brambory',
    ]);
  });

  it('clean edit returns null (load snapshot equals live)', async () => {
    const date = '2024-10-03';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    expect(editor.discardDescriptor()).toBeNull();
  });

  it('dirty edit returns kind "edit" + working meal carrying live notes', async () => {
    const date = '2024-10-04';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch', notes: 'orig' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    editor.notes = 'changed mid-edit';

    const desc = editor.discardDescriptor();
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('edit');
    expect(desc!.workingMeal.notes).toBe('changed mid-edit');
  });

  it('discardDescriptor("delete") returns kind "delete" with the current working meal (regardless of dirtiness)', async () => {
    // Delete is an explicit user action; the editor can't infer it from its own
    // state. The route calls discardDescriptor('delete') after the row is gone
    // from Dexie, threading the captured working meal into the buffer.
    const date = '2024-10-05';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch', notes: 'will be removed' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    const desc = editor.discardDescriptor('delete');
    expect(desc).not.toBeNull();
    expect(desc!.kind).toBe('delete');
    expect(desc!.workingMeal.notes).toBe('will be removed');
    expect(desc!.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId))).toEqual([
      'brambory',
    ]);
  });
});

describe('createMealEditor — applyUndo()', () => {
  it('after applyUndo(buffer with kind="edit") rehydrates state and re-fetches createdAt', async () => {
    // Simulates the round-trip: open existing meal, dirty it, navigate away
    // (writes buffer), navigate back (mounts a fresh editor), call applyUndo.
    const date = '2024-10-06';
    const originalCreatedAt = '2024-10-06T07:00:00.000Z';
    const session = createMealSession(date);
    await session.save(
      makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch', createdAt: originalCreatedAt }),
    );

    // First editor: simulates the screen the user dirties before navigating away.
    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'lunch' });
    editor1.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor1.update((m) => confirmFood(m, 'vegetables', 'mrkev'));
    editor1.notes = 'dirty edit notes';
    const desc = editor1.discardDescriptor();
    expect(desc?.kind).toBe('edit');

    // Fresh editor (page remounted on undo navigation): apply the buffer.
    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'lunch' },
      { kind: 'edit', workingMeal: desc!.workingMeal, mealType: 'lunch', returnTo: '/day/2024-10-06' },
    );

    expect(editor2.finalizeKind).toBe('edit');
    expect(editor2.dirty).toBe(false);
    expect(editor2.notes).toBe('dirty edit notes');
    expect(editor2.confirmedFoods.map((f) => f.foodId).sort()).toEqual(['brambory', 'mrkev']);
    expect(editor2.loadedCreatedAt).toBe(originalCreatedAt);
  });

  it('back-out → undo → finalize round-trip preserves the original createdAt', async () => {
    const date = '2024-10-07';
    const originalCreatedAt = '2024-10-07T06:00:00.000Z';
    const session = createMealSession(date);
    await session.save(
      makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch', createdAt: originalCreatedAt }),
    );

    // Editor 1: dirty + capture descriptor.
    const editor1 = createMealEditor();
    await editor1.open({ date, mealType: 'lunch' });
    editor1.update((m) => startEditing(m, 'vegetables', 'mrkev', 'Mrkev'));
    editor1.update((m) => confirmFood(m, 'vegetables', 'mrkev'));
    const desc = editor1.discardDescriptor()!;

    // Editor 2: undo + finalize.
    const editor2 = createMealEditor();
    await editor2.applyUndo(
      { date, mealType: 'lunch' },
      { kind: desc.kind, workingMeal: desc.workingMeal, mealType: 'lunch', returnTo: '/day/x' },
    );
    const result = await editor2.finalize();
    expect(result).toMatchObject({ ok: true });

    const reload = await createMealSession(date).loadBySlot(date, 'lunch');
    if (!reload.ok || !reload.data) throw new Error('expected reload to succeed');
    expect(reload.data.createdAt).toBe(originalCreatedAt);
    expect(reload.data.updatedAt).toBeDefined();
  });

  it('after applyUndo(buffer with kind="delete") finalize-state is compose-new (next save mints fresh createdAt)', async () => {
    const date = '2024-10-08';
    const editor = createMealEditor();

    await editor.applyUndo(
      { date, mealType: 'lunch' },
      {
        kind: 'delete',
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
        returnTo: '/day/x',
      },
    );

    expect(editor.finalizeKind).toBe('compose');
    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
    expect(editor.notes).toBe('restored');
    expect(editor.loadedCreatedAt).toBeNull();
  });

  it('after applyUndo(buffer with kind="compose") finalize-state is compose-new', async () => {
    const date = '2024-10-09';
    const editor = createMealEditor();

    await editor.applyUndo(
      { date, mealType: 'breakfast' },
      {
        kind: 'compose',
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
        returnTo: '/day/x',
      },
    );

    expect(editor.finalizeKind).toBe('compose');
    expect(editor.dirty).toBe(true);
    expect(editor.notes).toBe('draft');
    expect(editor.loadedCreatedAt).toBeNull();
  });
});

describe('createMealEditor — order-independent food comparison', () => {
  it('reordering confirmed foods (deselect then re-add) leaves the edit clean', async () => {
    // Seed two foods and verify that deselecting one and re-adding it (which
    // appends to the working list) does not flip dirty.
    const date = '2024-09-13';
    const session = createMealSession(date);
    await session.save({
      id: `${date}:lunch`,
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
    await editor.open({ date, mealType: 'lunch' });
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
    await editor.open({ date, mealType: 'breakfast' });

    const result = await editor.finalize();
    expect(result).toMatchObject({ ok: true });

    const reload = await createMealSession(date).loadBySlot(date, 'breakfast');
    expect(reload).toMatchObject({ ok: true, data: null });
  });
});

describe('createMealEditor — eliminatedFoodIds + hasConflicts', () => {
  it('with eliminatedToday=["dairy"], confirming a dairy food puts its id in eliminatedFoodIds and sets hasConflicts', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-01', mealType: 'breakfast' }, ['dairy']);

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));
    editor.update((m) => confirmFood(m, 'dairy', 'kravske-mleko'));

    expect(editor.eliminatedFoodIds).toEqual(new Set(['kravske-mleko']));
    expect(editor.hasConflicts).toBe(true);
  });

  it('with no eliminatedToday provided, eliminatedFoodIds is empty and hasConflicts is false even with foods confirmed', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-02', mealType: 'breakfast' });

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));
    editor.update((m) => confirmFood(m, 'dairy', 'kravske-mleko'));

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);
  });

  it('with eliminatedToday=["dairy"], a non-dairy food does not appear in eliminatedFoodIds', async () => {
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-03', mealType: 'breakfast' }, ['dairy']);

    editor.update((m) => startEditing(m, 'vegetables', 'brambory', 'Brambory'));
    editor.update((m) => confirmFood(m, 'vegetables', 'brambory'));

    expect(editor.eliminatedFoodIds).toEqual(new Set());
    expect(editor.hasConflicts).toBe(false);
  });

  it('eliminatedFoodIds includes a food that is still in editing (not yet confirmed)', async () => {
    // Mirrors the route's per-row danger styling: an editing food that touches
    // an eliminated allergen must be flagged before the user confirms.
    const editor = createMealEditor();
    await editor.open({ date: '2024-11-04', mealType: 'breakfast' }, ['dairy']);

    editor.update((m) => startEditing(m, 'dairy', 'kravske-mleko', 'Kravské mléko'));

    expect(editor.eliminatedFoodIds.has('kravske-mleko')).toBe(true);
    expect(editor.hasConflicts).toBe(true);
  });
});
