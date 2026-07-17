import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtopicDb } from '$lib/db/atopic-db';
import type { Ladder, LadderStep } from '$lib/domain/canonical-allergen';

import { DexieLadderOverrideRepo } from './dexie-ladder-override-repo';

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
  });

  // ── Slice 3: preserves Ladder shape exactly ──────────────────

  it('persists a multi-stage ladder with all stages preserved', async () => {
    const ladder: Ladder = {
      allergenId: 'vejce',
      stages: {
        breastfed: [{ id: 'bf-1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' }],
        mixed: [
          { id: 'mx-1', anchor: 'teaspoon', isEvaluationCheckpoint: false, dose: 'lžička' },
          { id: 'mx-2', anchor: 'spoon', isEvaluationCheckpoint: true, dose: 'lžíce' },
        ],
        solids: [{ id: 'so-1', anchor: 'portion', isEvaluationCheckpoint: true, dose: 'porce' }],
      },
    };
    await repo.save(ladder);
    expect(await repo.loadByAllergen('vejce')).toEqual({ ok: true, data: ladder });
  });

  // ── Slice 4: error paths ─────────────────────────────────────

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
});
