import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { SettingsData } from '$lib/domain/models';

import { DexieSettingsRepository } from './dexie-settings-repository';

const sampleSettings: SettingsData = { feedingStage: 'breastfed' };

describe('DexieSettingsRepository', () => {
  let repo: DexieSettingsRepository;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB, IDBKeyRange });
    repo = new DexieSettingsRepository(db);
  });

  it('returns Ok(null) when nothing has been saved', async () => {
    expect(await repo.load()).toEqual({ ok: true, data: null });
  });

  it('returns Ok(settings) after save', async () => {
    expect(await repo.save(sampleSettings)).toMatchObject({ ok: true });
    expect(await repo.load()).toMatchObject({ ok: true, data: sampleSettings });
  });

  it('overwrites previous settings on second save', async () => {
    await repo.save(sampleSettings);
    const updated: SettingsData = { feedingStage: 'solids' };
    await repo.save(updated);
    expect(await repo.load()).toMatchObject({ ok: true, data: updated });
  });

  it('returns Err when save throws', async () => {
    vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('DB write error'));
    expect(await repo.save(sampleSettings)).toEqual({ ok: false, error: 'DB write error' });
  });

  it('returns Err when load throws', async () => {
    vi.spyOn(db.settings, 'get').mockRejectedValueOnce(new Error('DB read error'));
    expect(await repo.load()).toEqual({ ok: false, error: 'DB read error' });
  });
});
