import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinObservationRepository } from './dexie-skin-observation-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { SkinObservation, SkinPhotoInput, RegionLevel, SkinRegionRecord } from '$lib/domain/models';

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

function makePhotoInput(overrides?: Partial<SkinPhotoInput>): SkinPhotoInput {
  return {
    region: 'face',
    blob: new Blob(['x'], { type: 'image/jpeg' }),
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

  it('save with inputs persists all photos transactionally', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-tx' });
    const inputs: SkinPhotoInput[] = [
      makePhotoInput({ region: 'face' }),
      makePhotoInput({ region: 'arms' }),
    ];
    await repo.save(obs, inputs);
    const photos = await db.photos.toArray();
    expect(photos).toHaveLength(2);
  });

  // ── FK minting ───────────────────────────────────────────────

  it('save mints observationId FK on each stored photo', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-fk' });
    await repo.save(obs, [makePhotoInput({ region: 'face' })]);
    const photos = await db.photos.toArray();
    expect(photos[0].observationId).toBe('obs-fk');
  });

  it('save mints a unique non-empty id on each stored photo', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-id' });
    const inputs = [makePhotoInput({ region: 'face' }), makePhotoInput({ region: 'arms' })];
    await repo.save(obs, inputs);
    const photos = await db.photos.toArray();
    expect(photos[0].id).toBeTruthy();
    expect(photos[1].id).toBeTruthy();
    expect(photos[0].id).not.toBe(photos[1].id);
  });

  it('save stores the region from SkinPhotoInput on the stored photo', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-region' });
    await repo.save(obs, [makePhotoInput({ region: 'belly' })]);
    const photos = await db.photos.toArray();
    expect(photos[0].region).toBe('belly');
  });

  it('save mints capturedAt as an ISO datetime string', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-cat' });
    await repo.save(obs, [makePhotoInput()]);
    const photos = await db.photos.toArray();
    expect(photos[0].capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ── Atomicity under partial-write failure ────────────────────

  it('save rolls back the observation when the photos write throws', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-tx' });
    vi.spyOn(db.photos, 'bulkPut').mockRejectedValueOnce(new Error('photos boom'));

    const result = await repo.save(obs, [makePhotoInput()]);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('photos boom');

    // Both tables must be empty — no orphan observation row, no orphan photo.
    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) expect(list.data).toHaveLength(0);
    expect(await db.photos.toArray()).toHaveLength(0);
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
