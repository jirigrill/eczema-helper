import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieLadderOverrideRepo } from './dexie-ladder-override-repo';
import { AtopicDb } from '$lib/db/atopic-db';
import type { Ladder, LadderStep } from '$lib/domain/canonical-allergen';

// ── Helpers ───────────────────────────────────────────────────

function makeLadder(allergenId: string, steps?: readonly LadderStep[]): Ladder {
  const defaultSteps: readonly LadderStep[] = [
    {
      id: `${allergenId}-1`,
      anchor: 'pinch',
      isEvaluationCheckpoint: false,
      dose: 'špetka',
    },
    {
      id: `${allergenId}-2`,
      anchor: 'teaspoon',
      isEvaluationCheckpoint: true,
      dose: 'lžička',
    },
  ];
  return {
    allergenId,
    stages: {
      breastfed: steps ?? defaultSteps,
    },
  };
}

// ─────────────────────────────────────────────────────────────

describe('DexieLadderOverrideRepo', () => {
  let repo: DexieLadderOverrideRepo;
  let db: AtopicDb;

  beforeEach(() => {
    // Fresh IDBFactory per test — prevents data bleeding between tests in the same suite.
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    repo = new DexieLadderOverrideRepo(db);
  });

  // ── Slice 1: round-trip ──────────────────────────────────────

  it('returns Ok(null) when no override is stored for the allergen', async () => {
    expect(await repo.loadByAllergen('vejce')).toEqual({ ok: true, data: null });
  });

  it('saves an override and loads it back by allergenId', async () => {
    const ladder = makeLadder('vejce');
    expect(await repo.save(ladder)).toMatchObject({ ok: true });
    expect(await repo.loadByAllergen('vejce')).toEqual({ ok: true, data: ladder });
  });

  // ── Slice 2: upsert ──────────────────────────────────────────

  it('second save for the same allergen overwrites the previous override', async () => {
    const first = makeLadder('vejce', [
      { id: 'first-1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'první' },
    ]);
    const second = makeLadder('vejce', [
      { id: 'second-1', anchor: 'spoon', isEvaluationCheckpoint: true, dose: 'druhý' },
    ]);
    await repo.save(first);
    await repo.save(second);

    const loaded = await repo.loadByAllergen('vejce');
    expect(loaded).toMatchObject({ ok: true, data: second });

    const list = await repo.listAll();
    if (list.ok) expect(list.data).toHaveLength(1);
  });

  // ── Slice 3: listAll ─────────────────────────────────────────

  it('listAll returns every stored override regardless of allergen', async () => {
    await repo.save(makeLadder('vejce'));
    await repo.save(makeLadder('sojove-mleko'));

    const result = await repo.listAll();
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.map((o) => o.allergenId).sort()).toEqual([
        'sojove-mleko',
        'vejce',
      ]);
    }
  });

  it('listAll returns empty array when nothing is stored', async () => {
    expect(await repo.listAll()).toEqual({ ok: true, data: [] });
  });

  // ── Slice 4: remove ──────────────────────────────────────────

  it('remove deletes the stored override', async () => {
    await repo.save(makeLadder('vejce'));
    expect(await repo.remove('vejce')).toEqual({ ok: true, data: undefined });
    expect(await repo.loadByAllergen('vejce')).toEqual({ ok: true, data: null });
  });

  it('remove only affects the targeted allergen', async () => {
    await repo.save(makeLadder('vejce'));
    await repo.save(makeLadder('sojove-mleko'));
    await repo.remove('vejce');

    const vejce = await repo.loadByAllergen('vejce');
    const soy = await repo.loadByAllergen('sojove-mleko');
    expect(vejce).toEqual({ ok: true, data: null });
    expect(soy.ok && soy.data?.allergenId).toBe('sojove-mleko');
  });

  it('remove on an unknown allergen is a no-op Ok', async () => {
    expect(await repo.remove('nothing-here')).toEqual({ ok: true, data: undefined });
  });

  // ── Slice 5: preserves Ladder shape exactly ──────────────────

  it('persists a multi-stage ladder with all stages preserved', async () => {
    const ladder: Ladder = {
      allergenId: 'vejce',
      stages: {
        breastfed: [
          { id: 'bf-1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
        ],
        mixed: [
          { id: 'mx-1', anchor: 'teaspoon', isEvaluationCheckpoint: false, dose: 'lžička' },
          { id: 'mx-2', anchor: 'spoon', isEvaluationCheckpoint: true, dose: 'lžíce' },
        ],
        solids: [
          { id: 'so-1', anchor: 'portion', isEvaluationCheckpoint: true, dose: 'porce' },
        ],
      },
    };
    await repo.save(ladder);
    expect(await repo.loadByAllergen('vejce')).toEqual({ ok: true, data: ladder });
  });

  // ── Slice 6: error paths ─────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.ladder_overrides, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await repo.save(makeLadder('vejce'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('loadByAllergen returns Err when DB throws', async () => {
    vi.spyOn(db.ladder_overrides, 'get').mockRejectedValueOnce(new Error('read fail'));
    const result = await repo.loadByAllergen('vejce');
    expect(result).toEqual({ ok: false, error: 'read fail' });
  });

  it('listAll returns Err when DB throws', async () => {
    vi.spyOn(db.ladder_overrides, 'toArray').mockRejectedValueOnce(new Error('list fail'));
    const result = await repo.listAll();
    expect(result).toEqual({ ok: false, error: 'list fail' });
  });

  it('remove returns Err when DB throws', async () => {
    vi.spyOn(db.ladder_overrides, 'delete').mockRejectedValueOnce(new Error('delete fail'));
    const result = await repo.remove('vejce');
    expect(result).toEqual({ ok: false, error: 'delete fail' });
  });
});
