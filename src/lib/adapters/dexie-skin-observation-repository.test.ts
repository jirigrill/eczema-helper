import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinObservationRepository } from './dexie-skin-observation-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { SkinObservation, SkinRegionRecord, RegionLevel } from '$lib/domain/models';

// ── Helpers ───────────────────────────────────────────────────

function makeObservation(date: string, overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: `obs-${date}`,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    regions: [{ id: 'face', level: 1 }],
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
    expect(await repo.save(obs, [])).toMatchObject({ ok: true });
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
    const first = makeObservation('2026-05-27', { id: 'obs-1', regions: [{ id: 'face', level: 1 }] });
    const second = makeObservation('2026-05-27', { id: 'obs-2', regions: [{ id: 'arms', level: 3 }] });
    await repo.save(first, []);
    await repo.save(second, []);

    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((o) => o.id).sort()).toEqual(['obs-1', 'obs-2']);
    }
  });

  it('observations for different date do not appear', async () => {
    await repo.save(makeObservation('2026-05-27', { id: 'obs-other' }), []);
    const result = await repo.listByDate('2026-05-28');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data).toHaveLength(0);
  });

  // ── Regions array preservation ───────────────────────────────

  it('persists the regions array exactly', async () => {
    const regions: SkinRegionRecord[] = [
      { id: 'face', level: 2 },
      { id: 'arms', level: 1 },
      { id: 'belly', level: 3 },
    ];
    const obs = makeObservation('2026-05-27', { id: 'obs-full', regions, notes: 'rash on left arm' });
    await repo.save(obs, []);
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data[0]).toEqual(obs);
  });

  it('observation without notes loads with notes absent', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-no-notes' });
    await repo.save(obs, []);
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data[0].notes).toBeUndefined();
  });

  it.each([1, 2, 3] as RegionLevel[])('region level %i round-trips', async (level) => {
    const obs = makeObservation('2026-05-27', {
      id: `obs-level-${level}`,
      regions: [{ id: 'face', level }],
    });
    await repo.save(obs, []);
    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data[0].regions[0].level).toBe(level);
  });

  // ── Upsert by id ─────────────────────────────────────────────

  it('second save for same id overwrites and does not duplicate', async () => {
    const first = makeObservation('2026-05-27', { id: 'obs-1', regions: [{ id: 'face', level: 1 }] });
    const second = makeObservation('2026-05-27', { id: 'obs-1', regions: [{ id: 'face', level: 3 }] });
    await repo.save(first, []);
    await repo.save(second, []);

    const result = await repo.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].regions[0].level).toBe(3);
    }
  });

  // ── Atomic save with photos ──────────────────────────────────

  it('save with empty photos array writes only the observation', async () => {
    const obs = makeObservation('2026-05-27');
    await repo.save(obs, []);
    const photos = await db.photos.toArray();
    expect(photos).toHaveLength(0);
  });

  it('save with photos persists all of them transactionally', async () => {
    const obs = makeObservation('2026-05-27');
    const photo = {
      id: 'photo-1',
      date: '2026-05-27',
      capturedAt: '2026-05-27T08:00:00.000Z',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
    };
    await repo.save(obs, [photo]);
    const photos = await db.photos.toArray();
    expect(photos).toHaveLength(1);
    expect(photos[0].id).toBe('photo-1');
  });

  // ── Error paths ───────────────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeObservation('2026-05-27'), []);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('write fail');
  });

  it('listByDate returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await repo.listByDate('2026-05-27');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });
});
