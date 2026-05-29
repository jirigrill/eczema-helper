import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinObservationRepository } from './dexie-skin-observation-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { SkinObservation } from '$lib/domain/models';

// ── Helpers ───────────────────────────────────────────────────

function makeObservation(date: string, overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: `obs-${date}`,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    status: 'unchanged',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('DexieSkinObservationRepository', () => {
  let repo: DexieSkinObservationRepository;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    repo = new DexieSkinObservationRepository(db);
  });

  // ── Round-trip ───────────────────────────────────────────────

  it('save() persists and listByDate() returns the observation', async () => {
    const obs = makeObservation('2026-05-27');
    expect(await repo.save(obs)).toMatchObject({ ok: true });
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(obs);
    }
  });

  it('listByDate returns empty array when nothing saved for that date', async () => {
    expect(await repo.listByDate('2026-05-27')).toEqual({ ok: true, data: [] });
  });

  // ── Multiple observations same date ──────────────────────────

  it('multiple observations for same date all appear in listByDate', async () => {
    const first = makeObservation('2026-05-27', { id: 'obs-1', status: 'improved' });
    const second = makeObservation('2026-05-27', { id: 'obs-2', status: 'worsened' });
    await repo.save(first);
    await repo.save(second);

    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((o) => o.id).sort()).toEqual(['obs-1', 'obs-2']);
    }
  });

  it('observations for different date do not appear', async () => {
    await repo.save(makeObservation('2026-05-27', { id: 'obs-other' }));
    const result = await repo.listByDate('2026-05-28');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data).toHaveLength(0);
  });

  // ── Scalar field preservation ────────────────────────────────

  it('persists all scalar fields exactly', async () => {
    const obs = makeObservation('2026-05-27', {
      id: 'obs-full',
      status: 'new-lesions',
      notes: 'rash on left arm',
      createdAt: '2026-05-27T09:15:30.000Z',
    });
    await repo.save(obs);
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data[0]).toEqual(obs);
  });

  it('observation without notes loads with notes absent', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-no-notes' });
    await repo.save(obs);
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data[0].notes).toBeUndefined();
  });

  it.each(['improved', 'unchanged', 'worsened', 'new-lesions'] as SkinObservation['status'][])(
    'status "%s" round-trips',
    async (status) => {
      const obs = makeObservation('2026-05-27', { id: `obs-${status}`, status });
      await repo.save(obs);
      const result = await repo.listByDate('2026-05-27');
      expect(result).toMatchObject({ ok: true });
      if (result.ok) expect(result.data[0].status).toBe(status);
    }
  );

  // ── Upsert by id ─────────────────────────────────────────────

  it('second save for same id overwrites and does not duplicate', async () => {
    const first = makeObservation('2026-05-27', { id: 'obs-1', status: 'improved' });
    const second = makeObservation('2026-05-27', { id: 'obs-1', status: 'worsened' });
    await repo.save(first);
    await repo.save(second);

    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('worsened');
    }
  });

  // ── Error paths ───────────────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeObservation('2026-05-27'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('listByDate returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await repo.listByDate('2026-05-27');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });
});
