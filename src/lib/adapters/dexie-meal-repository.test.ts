import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieMealRepository } from './dexie-meal-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { Meal, MealItem } from '$lib/domain/models';
import { PREPARATION_METHODS } from '$lib/domain/models';

// ── Helpers ───────────────────────────────────────────────────

function makeMeal(date: string, mealType: Meal['mealType'], overrides?: Partial<Meal>): Meal {
  return {
    id: `${date}:${mealType}`,
    date,
    mealType,
    actor: 'mother',
    items: [],
    createdAt: `${date}T08:00:00.000Z`,
    ...overrides,
  };
}

function makeItem(id: string, overrides?: Partial<MealItem>): MealItem {
  return {
    id,
    name: 'Testovací položka',
    foodId: 'ryze',
    amount: 'portion',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('DexieMealRepository', () => {
  let repo: DexieMealRepository;
  let db: AtopicDb;

  beforeEach(() => {
    // Fresh IDBFactory per test — prevents data bleeding between tests in the same suite.
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    repo = new DexieMealRepository(db);
  });

  // ── Slice 1: round-trip ──────────────────────────────────────

  it('returns Ok(null) when slot has nothing saved', async () => {
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toEqual({ ok: true, data: null });
  });

  it('saves a meal and loads it back by slot', async () => {
    const meal = makeMeal('2026-05-27', 'lunch', { notes: 'test note' });
    expect(await repo.save(meal)).toMatchObject({ ok: true });
    expect(await repo.loadBySlot('2026-05-27', 'lunch')).toEqual({ ok: true, data: meal });
  });

  // ── Slice 2: upsert ──────────────────────────────────────────

  it('second save for same slot overwrites and does not duplicate', async () => {
    const first = makeMeal('2026-05-27', 'lunch', { notes: 'first' });
    const second = makeMeal('2026-05-27', 'lunch', { notes: 'second' });

    await repo.save(first);
    await repo.save(second);

    // loadBySlot returns the updated data
    expect(await repo.loadBySlot('2026-05-27', 'lunch')).toMatchObject({
      ok: true,
      data: second,
    });
    // listByDate shows exactly one record for that date
    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) expect(list.data).toHaveLength(1);
  });

  // ── Slice 3: listByDate ──────────────────────────────────────

  it('listByDate returns all meals for a date regardless of mealType', async () => {
    await repo.save(makeMeal('2026-05-27', 'breakfast'));
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    await repo.save(makeMeal('2026-05-28', 'dinner')); // different date — must not appear

    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((m) => m.mealType).sort()).toEqual(['breakfast', 'lunch']);
    }
  });

  it('listByDate returns empty array when nothing saved for date', async () => {
    expect(await repo.listByDate('2026-05-27')).toEqual({ ok: true, data: [] });
  });

  // ── Meal scalar fields ───────────────────────────────────────

  it('persists all Meal scalar fields exactly', async () => {
    const meal = makeMeal('2026-05-27', 'breakfast', {
      actor: 'mother',
      notes: 'morning oatmeal',
      createdAt: '2026-05-27T07:30:45.123Z',
    });
    await repo.save(meal);
    expect(await repo.loadBySlot('2026-05-27', 'breakfast')).toEqual({ ok: true, data: meal });
  });

  it('Meal without notes loads with notes absent', async () => {
    const meal = makeMeal('2026-05-27', 'snack');
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'snack');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.notes).toBeUndefined();
  });

  it('actor: baby persists correctly', async () => {
    const meal = makeMeal('2026-05-27', 'lunch', { actor: 'baby' });
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true, data: { actor: 'baby' } });
  });

  it('createdAt ISO string is preserved exactly', async () => {
    const meal = makeMeal('2026-05-27', 'dinner', { createdAt: '2026-05-27T19:45:00.000Z' });
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'dinner');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.createdAt).toBe('2026-05-27T19:45:00.000Z');
  });

  // ── MealItem round-trips ─────────────────────────────────────

  it('persists a MealItem with all fields set', async () => {
    const item = makeItem('item-1', {
      name: 'Jogurt',
      foodId: 'kravske-mleko',
      amount: 'portion',
      preparationMethod: 'boiled',
    });
    const meal = makeMeal('2026-05-27', 'breakfast', { items: [item] });
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'breakfast');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]).toEqual(item);
  });

  it('MealItem without preparationMethod loads with preparationMethod absent', async () => {
    const item = makeItem('item-1', { name: 'Rýže', foodId: 'ryze', amount: 'spoon' });
    // no preparationMethod
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].preparationMethod).toBeUndefined();
  });

  it('MealItem with catalog foodId persists correctly', async () => {
    const item = makeItem('item-1', { foodId: 'kravske-mleko' });
    await repo.save(makeMeal('2026-05-27', 'snack', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'snack');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].foodId).toBe('kravske-mleko');
  });

  it('MealItem with custom foodId persists correctly', async () => {
    const item = makeItem('item-1', { foodId: 'other:vlastni-jidlo' });
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].foodId).toBe('other:vlastni-jidlo');
  });

  it('multiple items in a meal all persist', async () => {
    const items = [
      makeItem('item-1', { name: 'Pšenice', foodId: 'psenice', amount: 'portion' }),
      makeItem('item-2', { name: 'Máslo', foodId: 'kravske-mleko', amount: 'teaspoon' }),
      makeItem('item-3', { name: 'Rajče', foodId: 'rajce', amount: 'spoon', preparationMethod: 'baked' }),
    ];
    await repo.save(makeMeal('2026-05-27', 'breakfast', { items }));
    const result = await repo.loadBySlot('2026-05-27', 'breakfast');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items).toEqual(items);
  });

  // ── preparationMethod — all four values ──────────────────────

  it.each(PREPARATION_METHODS)('preparationMethod "%s" round-trips', async (method) => {
    const item = makeItem('item-1', { preparationMethod: method });
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].preparationMethod).toBe(method);
  });

  // ── MealItem upsert ──────────────────────────────────────────

  it('re-saving a slot replaces all items — old items are gone', async () => {
    const first = makeMeal('2026-05-27', 'dinner', {
      items: [makeItem('item-a', { name: 'Polévka' })],
    });
    const second = makeMeal('2026-05-27', 'dinner', {
      items: [makeItem('item-b', { name: 'Salát' })],
    });
    await repo.save(first);
    await repo.save(second);

    const result = await repo.loadBySlot('2026-05-27', 'dinner');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].id).toBe('item-b');
    }
  });

  it('re-saving with changed preparationMethod reflects new value', async () => {
    const base = { id: 'item-1', name: 'Kuře', foodId: 'kureci', amount: 'portion' } as const;
    await repo.save(makeMeal('2026-05-27', 'lunch', {
      items: [{ ...base, preparationMethod: 'boiled' }],
    }));
    await repo.save(makeMeal('2026-05-27', 'lunch', {
      items: [{ ...base, preparationMethod: 'baked' }],
    }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].preparationMethod).toBe('baked');
  });

  it('re-saving without preparationMethod removes it from the persisted item', async () => {
    const withMethod = makeItem('item-1', { preparationMethod: 'boiled' });
    const withoutMethod = makeItem('item-1'); // preparationMethod absent
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [withMethod] }));
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [withoutMethod] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0].preparationMethod).toBeUndefined();
  });

  it('re-saving with fewer items removes the dropped items', async () => {
    const twoItems = [makeItem('item-1'), makeItem('item-2')];
    const oneItem = [makeItem('item-1')];
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: twoItems }));
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: oneItem }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items).toHaveLength(1);
  });

  // ── Slot isolation (MealId) ───────────────────────────────────

  it('same date different mealType creates isolated slots', async () => {
    const lunch = makeMeal('2026-05-27', 'lunch', {
      items: [makeItem('item-l', { name: 'Oběd' })],
    });
    const dinner = makeMeal('2026-05-27', 'dinner', {
      items: [makeItem('item-d', { name: 'Večeře' })],
    });
    await repo.save(lunch);
    await repo.save(dinner);

    const lunchResult = await repo.loadBySlot('2026-05-27', 'lunch');
    const dinnerResult = await repo.loadBySlot('2026-05-27', 'dinner');
    expect(lunchResult).toMatchObject({ ok: true });
    expect(dinnerResult).toMatchObject({ ok: true });
    if (lunchResult.ok) expect(lunchResult.data?.items[0].name).toBe('Oběd');
    if (dinnerResult.ok) expect(dinnerResult.data?.items[0].name).toBe('Večeře');
  });

  it('saving one slot does not affect another slot on the same date', async () => {
    await repo.save(makeMeal('2026-05-27', 'breakfast'));
    // lunch slot untouched
    expect(await repo.loadBySlot('2026-05-27', 'lunch')).toEqual({ ok: true, data: null });
  });

  // ── remove: clears a slot (explicit "Smazat jídlo" action, issue #268) ──

  it('remove deletes the meal occupying a slot', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(await repo.remove('2026-05-27', 'lunch')).toEqual({ ok: true, data: undefined });
    expect(await repo.loadBySlot('2026-05-27', 'lunch')).toEqual({ ok: true, data: null });
  });

  it('remove only affects the targeted slot', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [makeItem('keep')] }));
    await repo.save(makeMeal('2026-05-27', 'dinner', { items: [makeItem('gone')] }));
    await repo.remove('2026-05-27', 'dinner');
    const lunch = await repo.loadBySlot('2026-05-27', 'lunch');
    const dinner = await repo.loadBySlot('2026-05-27', 'dinner');
    expect(lunch.ok && lunch.data?.items[0].id).toBe('keep');
    expect(dinner).toEqual({ ok: true, data: null });
  });

  it('remove on an empty slot is a no-op Ok', async () => {
    expect(await repo.remove('2026-05-27', 'snack')).toEqual({ ok: true, data: undefined });
  });

  it('remove returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'delete').mockRejectedValueOnce(new Error('delete fail'));
    const result = await repo.remove('2026-05-27', 'lunch');
    expect(result).toEqual({ ok: false, error: 'delete fail' });
  });

  // ── Slice 4: error paths ─────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('loadBySlot returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'get').mockRejectedValueOnce(new Error('read fail'));
    const result = await repo.loadBySlot('2026-05-27', 'lunch');
    expect(result).toEqual({ ok: false, error: 'read fail' });
  });

  it('listByDate returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await repo.listByDate('2026-05-27');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });
});
