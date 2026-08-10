import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { Meal, MealItem } from '$lib/domain/models';
import { PREPARATION_METHODS, mealId } from '$lib/domain/models';
import { copyMealInto } from '$lib/domain/working-meal';

import { DexieMealRepository } from './dexie-meal-repository';

// ── Helpers ───────────────────────────────────────────────────

function makeMeal(date: string, mealType: Meal['mealType'], overrides?: Partial<Meal>): Meal {
  const actor = overrides?.actor ?? 'mother';
  return {
    id: mealId(date, mealType, actor),
    date,
    mealType,
    actor,
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
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toEqual({ ok: true, data: null });
  });

  it('saves a meal and loads it back by slot', async () => {
    const meal = makeMeal('2026-05-27', 'lunch', { notes: 'test note' });
    expect(await repo.save(meal)).toMatchObject({ ok: true });
    expect(await repo.loadBySlot('2026-05-27', 'lunch', 'mother')).toEqual({
      ok: true,
      data: meal,
    });
  });

  // ── Slice 2: upsert ──────────────────────────────────────────

  it('second save for same slot overwrites and does not duplicate', async () => {
    const first = makeMeal('2026-05-27', 'lunch', { notes: 'first' });
    const second = makeMeal('2026-05-27', 'lunch', { notes: 'second' });

    await repo.save(first);
    await repo.save(second);

    // loadBySlot returns the updated data
    expect(await repo.loadBySlot('2026-05-27', 'lunch', 'mother')).toMatchObject({
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
    expect(await repo.loadBySlot('2026-05-27', 'breakfast', 'mother')).toEqual({
      ok: true,
      data: meal,
    });
  });

  it('Meal without notes loads with notes absent', async () => {
    const meal = makeMeal('2026-05-27', 'snack');
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'snack', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.notes).toBeUndefined();
  });

  it('actor: baby persists correctly', async () => {
    const meal = makeMeal('2026-05-27', 'lunch', { actor: 'baby' });
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'baby');
    expect(result).toMatchObject({ ok: true, data: { actor: 'baby' } });
  });

  it('createdAt ISO string is preserved exactly', async () => {
    const meal = makeMeal('2026-05-27', 'dinner', { createdAt: '2026-05-27T19:45:00.000Z' });
    await repo.save(meal);
    const result = await repo.loadBySlot('2026-05-27', 'dinner', 'mother');
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
    const result = await repo.loadBySlot('2026-05-27', 'breakfast', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]).toEqual(item);
  });

  it('MealItem without preparationMethod loads with preparationMethod absent', async () => {
    const item = makeItem('item-1', { name: 'Rýže', foodId: 'ryze', amount: 'spoon' });
    // no preparationMethod
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.preparationMethod).toBeUndefined();
  });

  it('MealItem with catalog foodId persists correctly', async () => {
    const item = makeItem('item-1', { foodId: 'kravske-mleko' });
    await repo.save(makeMeal('2026-05-27', 'snack', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'snack', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.foodId).toBe('kravske-mleko');
  });

  it('MealItem with custom foodId persists correctly', async () => {
    const item = makeItem('item-1', { foodId: 'other:vlastni-jidlo' });
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.foodId).toBe('other:vlastni-jidlo');
  });

  it('multiple items in a meal all persist', async () => {
    const items = [
      makeItem('item-1', { name: 'Pšenice', foodId: 'psenice', amount: 'portion' }),
      makeItem('item-2', { name: 'Máslo', foodId: 'kravske-mleko', amount: 'teaspoon' }),
      makeItem('item-3', {
        name: 'Rajče',
        foodId: 'rajce',
        amount: 'spoon',
        preparationMethod: 'baked',
      }),
    ];
    await repo.save(makeMeal('2026-05-27', 'breakfast', { items }));
    const result = await repo.loadBySlot('2026-05-27', 'breakfast', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items).toEqual(items);
  });

  // ── preparationMethod — all four values ──────────────────────

  it.each(PREPARATION_METHODS)('preparationMethod "%s" round-trips', async (method) => {
    const item = makeItem('item-1', { preparationMethod: method });
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [item] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.preparationMethod).toBe(method);
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

    const result = await repo.loadBySlot('2026-05-27', 'dinner', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0]!.id).toBe('item-b');
    }
  });

  it('re-saving with changed preparationMethod reflects new value', async () => {
    const base = { id: 'item-1', name: 'Kuře', foodId: 'kureci', amount: 'portion' } as const;
    await repo.save(
      makeMeal('2026-05-27', 'lunch', {
        items: [{ ...base, preparationMethod: 'boiled' }],
      }),
    );
    await repo.save(
      makeMeal('2026-05-27', 'lunch', {
        items: [{ ...base, preparationMethod: 'baked' }],
      }),
    );
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.preparationMethod).toBe('baked');
  });

  it('re-saving without preparationMethod removes it from the persisted item', async () => {
    const withMethod = makeItem('item-1', { preparationMethod: 'boiled' });
    const withoutMethod = makeItem('item-1'); // preparationMethod absent
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [withMethod] }));
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [withoutMethod] }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data?.items[0]!.preparationMethod).toBeUndefined();
  });

  it('re-saving with fewer items removes the dropped items', async () => {
    const twoItems = [makeItem('item-1'), makeItem('item-2')];
    const oneItem = [makeItem('item-1')];
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: twoItems }));
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: oneItem }));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
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

    const lunchResult = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    const dinnerResult = await repo.loadBySlot('2026-05-27', 'dinner', 'mother');
    expect(lunchResult).toMatchObject({ ok: true });
    expect(dinnerResult).toMatchObject({ ok: true });
    if (lunchResult.ok) expect(lunchResult.data?.items[0]!.name).toBe('Oběd');
    if (dinnerResult.ok) expect(dinnerResult.data?.items[0]!.name).toBe('Večeře');
  });

  it('one-per-slot-per-actor: a mother meal and a baby meal coexist in the same (date, mealType)', async () => {
    // The whole reason MealId gained a third part (spec #554): a single
    // (date, mealType) slot must hold up to one meal PER actor, not one total.
    const motherLunch = makeMeal('2026-05-27', 'lunch', {
      actor: 'mother',
      items: [makeItem('m1', { name: 'Mámino' })],
    });
    const babyLunch = makeMeal('2026-05-27', 'lunch', {
      actor: 'baby',
      items: [makeItem('b1', { name: 'Miminkovo' })],
    });
    await repo.save(motherLunch);
    await repo.save(babyLunch);

    // Each actor's slot returns its own record — neither overwrote the other.
    const motherSlot = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    const babySlot = await repo.loadBySlot('2026-05-27', 'lunch', 'baby');
    expect(motherSlot).toMatchObject({ ok: true });
    expect(babySlot).toMatchObject({ ok: true });
    if (motherSlot.ok) expect(motherSlot.data?.items[0]!.name).toBe('Mámino');
    if (babySlot.ok) expect(babySlot.data?.items[0]!.name).toBe('Miminkovo');

    // listByDate returns both as two distinct rows.
    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) {
      expect(list.data).toHaveLength(2);
      expect(list.data.map((m) => m.actor).sort()).toEqual(['baby', 'mother']);
    }
  });

  it('remove targets one actor without touching the other in the same slot', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch', { actor: 'mother', items: [makeItem('m1')] }));
    await repo.save(makeMeal('2026-05-27', 'lunch', { actor: 'baby', items: [makeItem('b1')] }));

    await repo.remove('2026-05-27', 'lunch', 'baby');

    expect(await repo.loadBySlot('2026-05-27', 'lunch', 'baby')).toEqual({ ok: true, data: null });
    const motherSlot = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(motherSlot.ok && motherSlot.data?.items[0]!.id).toBe('m1');
  });

  it('saving one slot does not affect another slot on the same date', async () => {
    await repo.save(makeMeal('2026-05-27', 'breakfast'));
    // lunch slot untouched
    expect(await repo.loadBySlot('2026-05-27', 'lunch', 'mother')).toEqual({
      ok: true,
      data: null,
    });
  });

  // ── remove: clears a slot (explicit "Smazat jídlo" action, issue #268) ──

  it('remove deletes the meal occupying a slot', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(await repo.remove('2026-05-27', 'lunch', 'mother')).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await repo.loadBySlot('2026-05-27', 'lunch', 'mother')).toEqual({
      ok: true,
      data: null,
    });
  });

  it('remove only affects the targeted slot', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch', { items: [makeItem('keep')] }));
    await repo.save(makeMeal('2026-05-27', 'dinner', { items: [makeItem('gone')] }));
    await repo.remove('2026-05-27', 'dinner', 'mother');
    const lunch = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    const dinner = await repo.loadBySlot('2026-05-27', 'dinner', 'mother');
    expect(lunch.ok && lunch.data?.items[0]!.id).toBe('keep');
    expect(dinner).toEqual({ ok: true, data: null });
  });

  it('remove on an empty slot is a no-op Ok', async () => {
    expect(await repo.remove('2026-05-27', 'snack', 'mother')).toEqual({
      ok: true,
      data: undefined,
    });
  });

  it('remove returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'delete').mockRejectedValueOnce(new Error('delete fail'));
    const result = await repo.remove('2026-05-27', 'lunch', 'mother');
    expect(result).toEqual({ ok: false, error: 'delete fail' });
  });

  // ── earliestLoggedDate (§3a, step 2b) ────────────────────────

  it('earliestLoggedDate returns null when the store is empty', async () => {
    expect(await repo.earliestLoggedDate()).toEqual({ ok: true, data: null });
  });

  it('earliestLoggedDate returns the date of the only logged meal', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(await repo.earliestLoggedDate()).toEqual({ ok: true, data: '2026-05-27' });
  });

  it('earliestLoggedDate returns the smallest date across meals inserted out of order', async () => {
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    await repo.save(makeMeal('2026-05-20', 'dinner'));
    await repo.save(makeMeal('2026-06-02', 'breakfast'));
    expect(await repo.earliestLoggedDate()).toEqual({ ok: true, data: '2026-05-20' });
  });

  it('earliestLoggedDate moves forward after the earliest meal is removed', async () => {
    await repo.save(makeMeal('2026-05-20', 'dinner'));
    await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(await repo.earliestLoggedDate()).toEqual({ ok: true, data: '2026-05-20' });

    await repo.remove('2026-05-20', 'dinner', 'mother');
    expect(await repo.earliestLoggedDate()).toEqual({ ok: true, data: '2026-05-27' });
  });

  // ── Slice 4: error paths ─────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeMeal('2026-05-27', 'lunch'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('loadBySlot returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'get').mockRejectedValueOnce(new Error('read fail'));
    const result = await repo.loadBySlot('2026-05-27', 'lunch', 'mother');
    expect(result).toEqual({ ok: false, error: 'read fail' });
  });

  it('listByDate returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await repo.listByDate('2026-05-27');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });

  it('earliestLoggedDate returns Err when DB throws', async () => {
    vi.spyOn(db.meals, 'orderBy').mockImplementation(() => {
      throw new Error('order fail');
    });
    const result = await repo.earliestLoggedDate();
    expect(result).toEqual({ ok: false, error: 'order fail' });
  });

  // ── Unbounded logging: no schedule-derived window (issue #628) ──────────
  //
  // The write adapter no longer consults any schedule. Any day the mother can
  // reach is loggable, however far from today, so a late (or early) entry is
  // never refused (§1 anchor 3, §4 step 3).

  describe('unbounded logging', () => {
    it('saves a meal on a day years in the past', async () => {
      const wayBefore = '2020-01-01';

      const result = await repo.save(makeMeal(wayBefore, 'lunch'));
      expect(result).toMatchObject({ ok: true });

      const persisted = await repo.loadBySlot(wayBefore, 'lunch', 'mother');
      expect(persisted.ok && persisted.data?.date).toBe(wayBefore);
    });

    it('saves a meal on a day years in the future', async () => {
      const wayAfter = '2030-12-31';

      const result = await repo.save(makeMeal(wayAfter, 'lunch'));
      expect(result).toMatchObject({ ok: true });

      const persisted = await repo.loadBySlot(wayAfter, 'lunch', 'mother');
      expect(persisted.ok && persisted.data?.date).toBe(wayAfter);
    });

    it('saves a copied meal on a day years in the past', async () => {
      const wayBefore = '2020-01-01';

      const source = makeMeal('2026-05-15', 'lunch', {
        items: [makeItem('src-1', { name: 'Rýže', foodId: 'ryze' })],
      });
      const destSlot = { date: wayBefore, mealType: 'dinner' as const, actor: 'mother' as const };
      const { meal } = copyMealInto(source, null, destSlot);

      expect(await repo.save(meal!)).toMatchObject({ ok: true });
      const persisted = await repo.loadBySlot(wayBefore, 'dinner', 'mother');
      expect(persisted.ok && persisted.data?.items[0]?.name).toBe('Rýže');
    });
  });

  // ── Copy-meal actor-scoping (spec #599, issue #606) ─────────────────────
  //
  // The merge target is resolved actor-scoped via `loadBySlot(date, slot,
  // source.actor)`. A copy into a `(date, slot)` cell that holds the OTHER
  // actor's meal must treat the source-actor's slot as empty (compose-new) and
  // leave the other actor's row byte-for-byte untouched.
  describe('copy-meal actor-scoping', () => {
    it('creates the source-actor slot as empty and leaves the other actor row untouched', async () => {
      // The destination cell is (2026-05-20, dinner). It already holds the
      // BABY's meal; the source is a MOTHER meal being copied here.
      const babyDinner = makeMeal('2026-05-20', 'dinner', {
        actor: 'baby',
        items: [makeItem('baby-1', { name: 'Miminkovo', foodId: 'other:baby-food' })],
        createdAt: '2026-05-20T18:00:00.000Z',
      });
      await repo.save(babyDinner);

      const source = makeMeal('2026-05-15', 'lunch', {
        actor: 'mother',
        items: [makeItem('src-1', { name: 'Rýže', foodId: 'ryze' })],
      });

      // Resolve the merge target actor-scoped to the SOURCE actor (mother).
      const targetResult = await repo.loadBySlot('2026-05-20', 'dinner', 'mother');
      expect(targetResult).toEqual({ ok: true, data: null }); // mother slot is empty

      const destSlot = {
        date: '2026-05-20',
        mealType: 'dinner' as const,
        actor: 'mother' as const,
      };
      const { meal } = copyMealInto(source, targetResult.ok ? targetResult.data : null, destSlot);
      await repo.save(meal!);

      // The mother's slot now exists with the copied food.
      const motherSlot = await repo.loadBySlot('2026-05-20', 'dinner', 'mother');
      expect(motherSlot.ok && motherSlot.data?.actor).toBe('mother');
      expect(motherSlot.ok && motherSlot.data?.items[0]?.name).toBe('Rýže');

      // The baby's row in the same cell is byte-for-byte untouched.
      const babySlot = await repo.loadBySlot('2026-05-20', 'dinner', 'baby');
      expect(babySlot).toEqual({ ok: true, data: babyDinner });
    });
  });

  // ── Dexie v10 migration: wipe the meals table on the 3-part MealId bump ──
  //
  // The composite key changes from `${date}:${mealType}` to
  // `${date}:${mealType}:${actor}`. Old 2-part-keyed rows are queried by the
  // `date` index and would leak into results and break on the 3-part
  // `parseMealId`, so v10 clears the table on upgrade (v7/v8 wipe precedent).
  describe('v10 migration wipe', () => {
    const DB_NAME = 'atopic-helper';

    // Seed a legacy row through a bare Dexie declaring only up to the v9 meals
    // schema — mirrors a client that last wrote under the 2-part key — then
    // close it so the real AtopicDb can reopen the same store and run the v10
    // upgrade.
    async function seedLegacyMealRow(indexedDB: IDBFactory): Promise<void> {
      const legacy = new Dexie(DB_NAME, { indexedDB, IDBKeyRange });
      legacy.version(9).stores({
        answers: '&id',
        schedule: '&id',
        meals: '&id, date',
        skin_observations: '&id, date',
        photos: '&id, observationId',
        harvest_candidates: '&normalizedKey, status',
        evaluations: '&phaseId, date',
        ladder_overrides: '&allergenId',
      });
      await legacy.open();
      // A row keyed by the OLD 2-part composite key.
      await legacy.table('meals').put({
        id: '2026-05-27:lunch',
        date: '2026-05-27',
        mealType: 'lunch',
        actor: 'mother',
        items: [],
        createdAt: '2026-05-27T08:00:00.000Z',
      });
      legacy.close();
    }

    it('clears pre-existing meal rows when upgrading to v10', async () => {
      const indexedDB = new IDBFactory();
      await seedLegacyMealRow(indexedDB);

      const upgraded = new AtopicDb({ indexedDB, IDBKeyRange });
      await upgraded.open();
      const count = await upgraded.meals.count();
      upgraded.close();

      expect(count).toBe(0);
    });

    it('post-upgrade loadBySlot returns cleanly for both actors', async () => {
      const indexedDB = new IDBFactory();
      await seedLegacyMealRow(indexedDB);

      const upgraded = new AtopicDb({ indexedDB, IDBKeyRange });
      const repo = new DexieMealRepository(upgraded);

      expect(await repo.loadBySlot('2026-05-27', 'lunch', 'mother')).toEqual({
        ok: true,
        data: null,
      });
      expect(await repo.loadBySlot('2026-05-27', 'lunch', 'baby')).toEqual({
        ok: true,
        data: null,
      });
      upgraded.close();
    });
  });
});
