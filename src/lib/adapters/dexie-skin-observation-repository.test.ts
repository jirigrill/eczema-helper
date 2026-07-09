import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinObservationRepository } from './dexie-skin-observation-repository';
import { AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';
import type {
  GeneratedSchedule,
  SkinObservation,
  SkinPhoto,
  SkinPhotoInput,
  RegionLevel,
  SkinRegionRecord,
} from '$lib/domain/models';
import { addDays } from '$lib/utils/date';
import { BUFFER_AFTER_END_DAYS, BUFFER_BEFORE_START_DAYS } from '$lib/domain/policy';

// ── Helpers ───────────────────────────────────────────────────

function makeSchedule(overrides?: Partial<GeneratedSchedule>): GeneratedSchedule {
  return {
    phases: [],
    permanentMother: [],
    permanentBaby: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-06-01',
    ...overrides,
  };
}

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

  // ── update() ─────────────────────────────────────────────────

  it('update overwrites regions and notes on an existing observation', async () => {
    const original = makeObservation('2026-05-27', {
      id: 'obs-upd',
      regions: [{ id: 'face', level: 1 }],
      notes: 'before',
    });
    await repo.save(original, []);

    const revised: SkinObservation = {
      ...original,
      regions: [{ id: 'face', level: 3 }, { id: 'arms', level: 2 }],
      notes: 'after',
    };
    const result = await repo.update(revised, { addPhotos: [], removePhotoIds: [] });
    expect(result).toMatchObject({ ok: true });

    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) {
      expect(list.data).toHaveLength(1);
      expect(list.data[0].regions).toEqual(revised.regions);
      expect(list.data[0].notes).toBe('after');
    }
  });

  it('update preserves id and createdAt from the persisted row', async () => {
    const original = makeObservation('2026-05-27', {
      id: 'obs-preserve',
      createdAt: '2026-05-27T08:00:00.000Z',
      regions: [{ id: 'face', level: 1 }],
    });
    await repo.save(original, []);

    const revised: SkinObservation = {
      ...original,
      // Attempt to pass a different createdAt — adapter must keep the original.
      createdAt: '2099-12-31T23:59:59.000Z',
      regions: [{ id: 'face', level: 2 }],
    };
    await repo.update(revised, { addPhotos: [], removePhotoIds: [] });

    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) {
      expect(list.data[0].id).toBe('obs-preserve');
      expect(list.data[0].createdAt).toBe('2026-05-27T08:00:00.000Z');
    }
  });

  it('update inserts photos from addPhotos with correct FK and minted id/capturedAt', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-add-photos' });
    await repo.save(obs, []);

    await repo.update(obs, {
      addPhotos: [makePhotoInput({ region: 'face' }), makePhotoInput({ region: 'arms' })],
      removePhotoIds: [],
    });

    const photos = await db.photos.where('observationId').equals('obs-add-photos').toArray();
    expect(photos).toHaveLength(2);
    expect(photos.every((p) => p.observationId === 'obs-add-photos')).toBe(true);
    expect(photos.every((p) => !!p.id)).toBe(true);
    expect(new Set(photos.map((p) => p.id)).size).toBe(2);
    expect(photos.every((p) => /^\d{4}-\d{2}-\d{2}T/.test(p.capturedAt))).toBe(true);
    expect(photos.map((p) => p.region).sort()).toEqual(['arms', 'face']);
  });

  it('update removes photos whose id is in removePhotoIds', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-remove-photos' });
    await repo.save(obs, [makePhotoInput({ region: 'face' }), makePhotoInput({ region: 'arms' })]);
    const beforePhotos = await db.photos.where('observationId').equals('obs-remove-photos').toArray();
    expect(beforePhotos).toHaveLength(2);
    const [toRemove, toKeep] = beforePhotos;

    await repo.update(obs, { addPhotos: [], removePhotoIds: [toRemove.id] });

    const afterPhotos = await db.photos.where('observationId').equals('obs-remove-photos').toArray();
    expect(afterPhotos).toHaveLength(1);
    expect(afterPhotos[0].id).toBe(toKeep.id);
  });

  it('update rolls back the observation row when the photos write throws', async () => {
    const original = makeObservation('2026-05-27', {
      id: 'obs-rollback',
      regions: [{ id: 'face', level: 1 }],
      notes: 'before',
    });
    await repo.save(original, []);

    vi.spyOn(db.photos, 'bulkPut').mockRejectedValueOnce(new Error('photos boom'));

    const revised: SkinObservation = {
      ...original,
      regions: [{ id: 'face', level: 3 }],
      notes: 'after',
    };
    const result = await repo.update(revised, {
      addPhotos: [makePhotoInput({ region: 'face' })],
      removePhotoIds: [],
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('photos boom');

    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) {
      expect(list.data).toHaveLength(1);
      expect(list.data[0].regions[0].level).toBe(1);
      expect(list.data[0].notes).toBe('before');
    }
  });

  it('update returns Err when DB throws', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-err' });
    await repo.save(obs, []);

    vi.spyOn(db.skin_observations, 'put').mockRejectedValueOnce(new Error('update fail'));

    const result = await repo.update(obs, { addPhotos: [], removePhotoIds: [] });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('update fail');
  });

  // ── remove() ─────────────────────────────────────────────────

  it('remove hard-deletes the observation', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-rm' });
    await repo.save(obs, []);
    const result = await repo.remove('obs-rm');
    expect(result).toMatchObject({ ok: true });

    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) expect(list.data).toHaveLength(0);
  });

  it('remove cascades to all SkinPhoto rows for that observation', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-rm-photos' });
    await repo.save(obs, [
      makePhotoInput({ region: 'face' }),
      makePhotoInput({ region: 'arms' }),
      makePhotoInput({ region: 'belly' }),
    ]);
    expect(await db.photos.where('observationId').equals('obs-rm-photos').count()).toBe(3);

    await repo.remove('obs-rm-photos');

    expect(await db.photos.where('observationId').equals('obs-rm-photos').count()).toBe(0);
  });

  it('remove does not affect photos belonging to a different observation', async () => {
    const kept = makeObservation('2026-05-27', { id: 'obs-keep' });
    const doomed = makeObservation('2026-05-27', { id: 'obs-doomed' });
    await repo.save(kept, [makePhotoInput({ region: 'face' })]);
    await repo.save(doomed, [makePhotoInput({ region: 'arms' })]);

    await repo.remove('obs-doomed');

    expect(await db.photos.where('observationId').equals('obs-keep').count()).toBe(1);
    expect(await db.photos.where('observationId').equals('obs-doomed').count()).toBe(0);
  });

  it('remove rolls back the observation when the photos delete throws', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-rm-rollback' });
    await repo.save(obs, [makePhotoInput({ region: 'face' })]);

    vi.spyOn(db.photos, 'where').mockImplementationOnce(() => {
      throw new Error('photos delete boom');
    });

    const result = await repo.remove('obs-rm-rollback');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('photos delete boom');

    // Pre-remove state: observation row and its photo still there.
    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) expect(list.data).toHaveLength(1);
    expect(await db.photos.where('observationId').equals('obs-rm-rollback').count()).toBe(1);
  });

  it('remove returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'delete').mockRejectedValueOnce(new Error('delete fail'));
    const result = await repo.remove('obs-nonexistent');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('delete fail');
  });

  // ── restore() ────────────────────────────────────────────────

  function makePhotoRow(overrides?: Partial<SkinPhoto>): SkinPhoto {
    return {
      id: 'photo-id',
      observationId: 'obs-restore',
      region: 'face',
      capturedAt: '2026-06-30T09:12:00.000Z',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
      ...overrides,
    };
  }

  it('restore reinserts observation with id and createdAt intact', async () => {
    const obs = makeObservation('2026-05-27', {
      id: 'obs-restore',
      createdAt: '2026-05-27T08:00:00.000Z',
      notes: 'restored',
    });
    const result = await repo.restore(obs, []);
    expect(result).toMatchObject({ ok: true });

    const list = await repo.listByDate('2026-05-27');
    expect(list).toMatchObject({ ok: true });
    if (list.ok) {
      expect(list.data).toHaveLength(1);
      expect(list.data[0].id).toBe('obs-restore');
      expect(list.data[0].createdAt).toBe('2026-05-27T08:00:00.000Z');
      expect(list.data[0].notes).toBe('restored');
    }
  });

  it('restore inserts photos verbatim (id, region, capturedAt round-trip)', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-restore' });
    const photo = makePhotoRow({
      id: 'photo-preserved',
      observationId: 'obs-restore',
      region: 'belly',
      capturedAt: '2026-05-27T09:12:00.000Z',
    });
    const result = await repo.restore(obs, [photo]);
    expect(result).toMatchObject({ ok: true });

    const rows = await db.photos.where('observationId').equals('obs-restore').toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('photo-preserved');
    expect(rows[0].region).toBe('belly');
    expect(rows[0].capturedAt).toBe('2026-05-27T09:12:00.000Z');
  });

  it('restore rejects when a photo id already belongs to a different observation', async () => {
    // Seed a different observation that owns the photo id we will try to reuse.
    const other = makeObservation('2026-05-27', { id: 'obs-other' });
    await repo.save(other, []);
    await db.photos.put({
      id: 'photo-collide',
      observationId: 'obs-other',
      region: 'face',
      capturedAt: '2026-05-27T08:00:00.000Z',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
    });

    const obs = makeObservation('2026-05-27', { id: 'obs-restore' });
    const result = await repo.restore(obs, [
      makePhotoRow({ id: 'photo-collide', observationId: 'obs-restore' }),
    ]);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/photo/i);

    // Neither the observation nor its photo landed.
    const list = await repo.listByDate('2026-05-27');
    if (list.ok) expect(list.data.some((o) => o.id === 'obs-restore')).toBe(false);
    const photo = await db.photos.get('photo-collide');
    expect(photo?.observationId).toBe('obs-other');
  });

  it('restore rolls back the observation when the photos write throws', async () => {
    const obs = makeObservation('2026-05-27', { id: 'obs-restore-rb' });
    vi.spyOn(db.photos, 'bulkPut').mockRejectedValueOnce(new Error('photos boom'));

    const result = await repo.restore(obs, [makePhotoRow({ id: 'photo-a', observationId: 'obs-restore-rb' })]);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('photos boom');

    const list = await repo.listByDate('2026-05-27');
    if (list.ok) expect(list.data.some((o) => o.id === 'obs-restore-rb')).toBe(false);
    expect(await db.photos.get('photo-a')).toBeUndefined();
  });

  it('restore returns Err when DB throws', async () => {
    vi.spyOn(db.skin_observations, 'put').mockRejectedValueOnce(new Error('restore fail'));
    const result = await repo.restore(makeObservation('2026-05-27', { id: 'obs-err' }), []);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain('restore fail');
  });

  // ── Loggable-window guard (BUFFER_BEFORE_START_DAYS / BUFFER_AFTER_END_DAYS) ──

  describe('loggable-window guard', () => {
    it('save succeeds for a date inside the schedule span', async () => {
      await db.schedule.put({ id: SINGLETON_ID, ...makeSchedule() });
      const result = await repo.save(makeObservation('2026-05-15'), []);
      expect(result).toMatchObject({ ok: true });
    });

    it('save rejects a date one day before the start-buffer boundary', async () => {
      const schedule = makeSchedule();
      await db.schedule.put({ id: SINGLETON_ID, ...schedule });
      const tooEarly = addDays(schedule.startDate, -BUFFER_BEFORE_START_DAYS - 1);
      const result = await repo.save(makeObservation(tooEarly, { id: 'obs-too-early' }), []);
      expect(result).toEqual({ ok: false, error: 'date-outside-loggable-window' });

      const list = await repo.listByDate(tooEarly);
      expect(list).toEqual({ ok: true, data: [] });
    });

    it('save rejects a date one day after the end-buffer boundary', async () => {
      const schedule = makeSchedule();
      await db.schedule.put({ id: SINGLETON_ID, ...schedule });
      const tooLate = addDays(schedule.estimatedEndDate, BUFFER_AFTER_END_DAYS + 1);
      const result = await repo.save(makeObservation(tooLate, { id: 'obs-too-late' }), []);
      expect(result).toEqual({ ok: false, error: 'date-outside-loggable-window' });

      const list = await repo.listByDate(tooLate);
      expect(list).toEqual({ ok: true, data: [] });
    });

    it('save is unguarded when no schedule has been generated yet', async () => {
      const result = await repo.save(makeObservation('1999-01-01'), []);
      expect(result).toMatchObject({ ok: true });
    });

    it('save does not write photos when the date is rejected', async () => {
      const schedule = makeSchedule();
      await db.schedule.put({ id: SINGLETON_ID, ...schedule });
      const tooEarly = addDays(schedule.startDate, -BUFFER_BEFORE_START_DAYS - 1);
      await repo.save(makeObservation(tooEarly, { id: 'obs-photo-guard' }), [makePhotoInput()]);

      expect(await db.photos.where('observationId').equals('obs-photo-guard').count()).toBe(0);
    });

    it('update rejects a date outside the loggable window', async () => {
      const schedule = makeSchedule();
      await db.schedule.put({ id: SINGLETON_ID, ...schedule });
      const original = makeObservation('2026-05-15', { id: 'obs-update-guard', notes: 'before' });
      await repo.save(original, []);

      const tooLate = addDays(schedule.estimatedEndDate, BUFFER_AFTER_END_DAYS + 1);
      const revised: SkinObservation = { ...original, date: tooLate, notes: 'after' };
      const result = await repo.update(revised, { addPhotos: [], removePhotoIds: [] });
      expect(result).toEqual({ ok: false, error: 'date-outside-loggable-window' });

      const list = await repo.listByDate('2026-05-15');
      expect(list).toMatchObject({ ok: true, data: [{ notes: 'before' }] });
    });
  });
});
