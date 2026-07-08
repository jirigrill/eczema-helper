import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { AtopicDb } from './atopic-db';
import { buildExportSnapshot, restoreExportSnapshot } from './export-snapshot';
import { DexieLadderOverrideRepo } from '$lib/adapters/dexie-ladder-override-repo';
import type { Ladder } from '$lib/domain/canonical-allergen';

function makeOverride(allergenId: string): Ladder {
  return {
    allergenId,
    stages: {
      breastfed: [
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
      ],
    },
  };
}

describe('export snapshot', () => {
  let sourceDb: AtopicDb;
  let targetDb: AtopicDb;

  beforeEach(() => {
    sourceDb = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    targetDb = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
  });

  it('includes ladder_overrides in the snapshot payload', async () => {
    const repo = new DexieLadderOverrideRepo(sourceDb);
    await repo.save(makeOverride('eggs'));
    await repo.save(makeOverride('celer'));

    const snapshot = await buildExportSnapshot(sourceDb);

    expect(snapshot.ladder_overrides.map((o) => o.allergenId).sort()).toEqual([
      'celer',
      'eggs',
    ]);
  });

  it('round-trips ladder_overrides across build → restore', async () => {
    const source = new DexieLadderOverrideRepo(sourceDb);
    const target = new DexieLadderOverrideRepo(targetDb);

    const eggs = makeOverride('eggs');
    const celer = makeOverride('celer');
    await source.save(eggs);
    await source.save(celer);

    const snapshot = await buildExportSnapshot(sourceDb);
    await restoreExportSnapshot(targetDb, snapshot);

    expect(await target.loadByAllergen('eggs')).toEqual({ ok: true, data: eggs });
    expect(await target.loadByAllergen('celer')).toEqual({ ok: true, data: celer });
  });

  it('restore replaces prior ladder_overrides on the target', async () => {
    const source = new DexieLadderOverrideRepo(sourceDb);
    const target = new DexieLadderOverrideRepo(targetDb);

    // Prior state on target: a stale override that should be wiped on restore.
    await target.save(makeOverride('mleko'));

    const eggs = makeOverride('eggs');
    await source.save(eggs);

    const snapshot = await buildExportSnapshot(sourceDb);
    await restoreExportSnapshot(targetDb, snapshot);

    // The stale target-only override is gone; only the snapshot's override remains.
    expect(await target.loadByAllergen('mleko')).toEqual({ ok: true, data: null });
    expect(await target.loadByAllergen('eggs')).toEqual({ ok: true, data: eggs });
  });

  it('snapshot serialises through JSON without losing ladder_overrides', async () => {
    // The ADR-0002 export blob is UTF-8 JSON encrypted with AES-256-GCM.
    // The snapshot payload must survive `JSON.stringify` / `JSON.parse` intact.
    const repo = new DexieLadderOverrideRepo(sourceDb);
    const eggs = makeOverride('eggs');
    await repo.save(eggs);

    const snapshot = await buildExportSnapshot(sourceDb);
    const roundTripped = JSON.parse(JSON.stringify(snapshot));

    expect(roundTripped.ladder_overrides).toEqual([eggs]);
  });
});
