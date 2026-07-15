import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';

import { DexieHarvestCandidateRepository } from './dexie-harvest-candidate-repository';

// ── Helpers ───────────────────────────────────────────────────

function makeCandidate(overrides: Partial<HarvestCandidate> = {}): HarvestCandidate {
  return {
    normalizedKey: 'křen',
    status: 'pending',
    count: 1,
    firstSeen: '2026-06-01T10:00:00.000Z',
    lastSeen: '2026-06-01T10:00:00.000Z',
    rawForms: ['Křen'],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('DexieHarvestCandidateRepository', () => {
  let repo: DexieHarvestCandidateRepository;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    repo = new DexieHarvestCandidateRepository(db);
  });

  // ── upsert / readByKey ────────────────────────────────────

  it('readByKey returns Ok(null) when nothing saved', async () => {
    expect(await repo.readByKey('křen')).toEqual({ ok: true, data: null });
  });

  it('upsert creates a new candidate and readByKey retrieves it', async () => {
    const candidate = makeCandidate();
    expect(await repo.upsert(candidate)).toMatchObject({ ok: true });
    expect(await repo.readByKey('křen')).toEqual({ ok: true, data: candidate });
  });

  it('upsert overwrites an existing candidate with the same normalizedKey', async () => {
    const first = makeCandidate({ count: 1, lastSeen: '2026-06-01T10:00:00.000Z' });
    const second = makeCandidate({
      count: 2,
      lastSeen: '2026-06-02T09:00:00.000Z',
      rawForms: ['Křen', 'křen'],
    });
    await repo.upsert(first);
    await repo.upsert(second);
    expect(await repo.readByKey('křen')).toEqual({ ok: true, data: second });
  });

  it('upsert does not duplicate — second upsert leaves one record', async () => {
    await repo.upsert(makeCandidate());
    await repo.upsert(makeCandidate({ count: 2 }));
    const list = await repo.listAll();
    expect(list.ok && list.data).toHaveLength(1);
  });

  // ── listAll ───────────────────────────────────────────────

  it('listAll returns empty array when nothing saved', async () => {
    expect(await repo.listAll()).toEqual({ ok: true, data: [] });
  });

  it('listAll returns all saved candidates', async () => {
    const a = makeCandidate({ normalizedKey: 'křen' });
    const b = makeCandidate({ normalizedKey: 'chren', rawForms: ['chren'] });
    await repo.upsert(a);
    await repo.upsert(b);
    const result = await repo.listAll();
    expect(result.ok && result.data).toHaveLength(2);
  });

  // ── listByStatus ──────────────────────────────────────────

  it('listByStatus returns only candidates with matching status', async () => {
    const pending = makeCandidate({ normalizedKey: 'křen', status: 'pending' });
    const ingested = makeCandidate({
      normalizedKey: 'chren',
      rawForms: ['chren'],
      status: 'ingested',
    });
    await repo.upsert(pending);
    await repo.upsert(ingested);
    const result = await repo.listByStatus('pending');
    expect(result.ok && result.data).toHaveLength(1);
    if (result.ok) expect(result.data[0]!.normalizedKey).toBe('křen');
  });

  it('listByStatus returns empty array when no candidates match', async () => {
    await repo.upsert(makeCandidate({ status: 'pending' }));
    expect(await repo.listByStatus('ingested')).toEqual({ ok: true, data: [] });
  });

  // ── status transition via upsert ──────────────────────────

  it('status transition: pending → ingested via re-upsert', async () => {
    await repo.upsert(makeCandidate({ status: 'pending' }));
    await repo.upsert(makeCandidate({ status: 'ingested' }));
    const result = await repo.readByKey('křen');
    expect(result.ok && result.data?.status).toBe('ingested');
  });

  // ── scalar field round-trips ──────────────────────────────

  it('all scalar fields persist exactly', async () => {
    const candidate = makeCandidate({
      normalizedKey: 'citrón',
      count: 5,
      firstSeen: '2026-05-01T08:00:00.000Z',
      lastSeen: '2026-06-01T10:00:00.000Z',
      rawForms: ['Citrón', 'citron', 'citrón'],
      status: 'ingested',
    });
    await repo.upsert(candidate);
    expect(await repo.readByKey('citrón')).toEqual({ ok: true, data: candidate });
  });

  // ── error paths ───────────────────────────────────────────

  it('upsert returns Err when DB throws', async () => {
    vi.spyOn(db.harvest_candidates, 'put').mockRejectedValueOnce(new Error('write fail'));
    expect(await repo.upsert(makeCandidate())).toEqual({ ok: false, error: 'write fail' });
  });

  it('readByKey returns Err when DB throws', async () => {
    vi.spyOn(db.harvest_candidates, 'get').mockRejectedValueOnce(new Error('read fail'));
    expect(await repo.readByKey('křen')).toEqual({ ok: false, error: 'read fail' });
  });

  it('listAll returns Err when DB throws', async () => {
    vi.spyOn(db.harvest_candidates, 'toArray').mockRejectedValueOnce(new Error('list fail'));
    expect(await repo.listAll()).toEqual({ ok: false, error: 'list fail' });
  });
});
