import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieMealRepository } from './dexie-meal-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { Meal } from '$lib/domain/models';

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
