import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { GeneratedSchedule } from '$lib/domain/models';

import { DexieScheduleRepository } from './dexie-schedule-repository';

const sampleSchedule: GeneratedSchedule = {
  phases: [],
  permanentMother: [],
  permanentBaby: [],
  startDate: '2025-06-01',
  estimatedEndDate: '2025-09-01',
};

describe('DexieScheduleRepository', () => {
  let repo: DexieScheduleRepository;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB, IDBKeyRange });
    repo = new DexieScheduleRepository(db);
  });

  it('returns Ok(null) when nothing has been saved', async () => {
    expect(await repo.load()).toEqual({ ok: true, data: null });
  });

  it('returns Ok(schedule) after save', async () => {
    expect(await repo.save(sampleSchedule)).toMatchObject({ ok: true });
    expect(await repo.load()).toMatchObject({ ok: true, data: sampleSchedule });
  });

  it('overwrites previous schedule on second save', async () => {
    await repo.save(sampleSchedule);
    const updated = { ...sampleSchedule, estimatedEndDate: '2025-10-01' };
    await repo.save(updated);
    expect(await repo.load()).toMatchObject({ ok: true, data: updated });
  });

  it('returns Err when save throws', async () => {
    vi.spyOn(db.schedule, 'put').mockRejectedValueOnce(new Error('DB write error'));
    expect(await repo.save(sampleSchedule)).toEqual({ ok: false, error: 'DB write error' });
  });

  it('returns Err when load throws', async () => {
    vi.spyOn(db.schedule, 'get').mockRejectedValueOnce(new Error('DB read error'));
    expect(await repo.load()).toEqual({ ok: false, error: 'DB read error' });
  });
});
