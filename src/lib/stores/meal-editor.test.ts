import { describe, it, expect } from 'vitest';
import { createMealEditor } from './meal-editor.svelte';
import { createMealSession } from './meal-session';
import { startEditing, confirmFood } from '$lib/domain/working-meal';
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
