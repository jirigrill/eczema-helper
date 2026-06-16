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

describe('createMealEditor — restore() re-captures snapshot', () => {
  it('after restore(kind="edit") the rehydrated state reads as the new clean baseline', async () => {
    const date = '2024-09-21';
    const session = createMealSession(date);
    await session.save(makeMeal({ id: `${date}:lunch`, date, mealType: 'lunch' }));

    const editor = createMealEditor();
    await editor.open({ date, mealType: 'lunch' });

    // Replay the post-load working meal back through restore() — simulates an
    // undo of a dirty back-out where the buffer happened to capture the load
    // baseline. The snapshot must be re-captured so the rehydrated state
    // reads as the new clean baseline.
    const snapshot = editor.workingMeal;
    await editor.restore({
      slot: { date, mealType: 'lunch' },
      workingMeal: snapshot,
      kind: 'edit',
    });

    expect(editor.finalizeKind).toBe('edit');
    expect(editor.dirty).toBe(false);
    expect(editor.canFinalize).toBe(false);
  });

  it('after restore(kind="delete") the row is gone → finalize-state is compose-new', async () => {
    const editor = createMealEditor();
    const date = '2024-09-22';
    await editor.restore({
      slot: { date, mealType: 'lunch' },
      workingMeal: {
        notes: '',
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
      kind: 'delete',
    });

    expect(editor.finalizeKind).toBe('compose');
    expect(editor.dirty).toBe(true);
    expect(editor.canFinalize).toBe(true);
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
