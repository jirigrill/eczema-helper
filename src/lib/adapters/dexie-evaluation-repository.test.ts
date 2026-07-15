import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { ReintroductionEvaluation, SkinEvaluationOutcome } from '$lib/domain/models';

import { DexieEvaluationRepository } from './dexie-evaluation-repository';

function makeEval(
  phaseId: string,
  overrides?: Partial<ReintroductionEvaluation>,
): ReintroductionEvaluation {
  return {
    phaseId,
    phaseType: 'allergen-test',
    outcome: 'tolerated',
    allergenId: 'dairy',
    date: '2026-05-23',
    ...overrides,
  };
}

describe('DexieEvaluationRepository', () => {
  let repo: DexieEvaluationRepository;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    repo = new DexieEvaluationRepository(db);
  });

  it('save() persists and loadByPhase() returns the evaluation', async () => {
    const ev = makeEval('reintro-dairy');
    expect(await repo.save(ev)).toMatchObject({ ok: true });
    const result = await repo.loadByPhase('reintro-dairy');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data).toEqual(ev);
  });

  it('loadByPhase returns null when nothing saved for that phase', async () => {
    expect(await repo.loadByPhase('reintro-dairy')).toEqual({ ok: true, data: null });
  });

  it('save with same phaseId replaces the prior verdict', async () => {
    const first = makeEval('reintro-dairy', { outcome: 'tolerated' });
    const second = makeEval('reintro-dairy', { outcome: 'mild-reaction' });
    await repo.save(first);
    await repo.save(second);

    const result = await repo.loadByPhase('reintro-dairy');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data?.outcome).toBe('mild-reaction');
    }
    const all = await repo.listAll();
    if (all.ok) expect(all.data).toHaveLength(1);
  });

  it('listAll returns every persisted evaluation', async () => {
    await repo.save(makeEval('reintro-dairy'));
    await repo.save(makeEval('reintro-eggs', { allergenId: 'eggs', outcome: 'mild-reaction' }));
    const result = await repo.listAll();
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.map((e) => e.phaseId).sort()).toEqual(['reintro-dairy', 'reintro-eggs']);
    }
  });

  it('persists scalar fields (notes, allergenId, phaseType)', async () => {
    const ev = makeEval('reintro-dairy', { notes: 'reddened cheeks', outcome: 'clear-reaction' });
    await repo.save(ev);
    const result = await repo.loadByPhase('reintro-dairy');
    if (result.ok) expect(result.data).toEqual(ev);
  });

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.evaluations, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeEval('reintro-dairy'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('loadByPhase returns Err when DB throws', async () => {
    vi.spyOn(db.evaluations, 'get').mockRejectedValueOnce(new Error('read fail'));
    const result = await repo.loadByPhase('reintro-dairy');
    expect(result).toEqual({ ok: false, error: 'read fail' });
  });

  it('persists each of the four SkinEvaluationOutcome values for skin-status phases', async () => {
    const outcomes: SkinEvaluationOutcome[] = ['improved', 'unchanged', 'worsened', 'new-lesions'];
    for (const outcome of outcomes) {
      const phaseId = `reset-${outcome}`;
      const ev: ReintroductionEvaluation = {
        phaseId,
        phaseType: 'skin-status',
        outcome,
        date: '2026-06-22',
      };
      expect(await repo.save(ev)).toMatchObject({ ok: true });
      const result = await repo.loadByPhase(phaseId);
      expect(result).toMatchObject({ ok: true });
      if (result.ok) expect(result.data?.outcome).toBe(outcome);
    }
  });
});
