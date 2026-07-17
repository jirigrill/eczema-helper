import { get } from 'svelte/store';

import { describe, expect, it } from 'vitest';

import { db } from '$lib/db/atopic-db';
import type { Ladder } from '$lib/domain/canonical-allergen';

import { createLadderOverrideSession } from './ladder-override-session';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

async function waitFor<T>(
  store: { subscribe: (cb: (v: T) => void) => () => void },
  predicate: (value: T) => boolean,
  timeoutMs = 500,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for predicate'));
    }, timeoutMs);
    unsub = store.subscribe((value) => {
      if (predicate(value)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(value);
      }
    });
  });
}

function makeLadder(allergenId: string): Ladder {
  return {
    allergenId,
    allergenicity: 'low',
    stages: {
      breastfed: [
        { id: `${allergenId}-1`, anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
      ],
    },
  };
}

describe('createLadderOverrideSession — per-allergen reactive subscription', () => {
  it('returns a Svelte readable of Ladder | null', () => {
    const session = createLadderOverrideSession('session-shape');
    expect(typeof session.subscribe).toBe('function');
  });

  it('initial store value is null', () => {
    const session = createLadderOverrideSession('never-stored');
    expect(get(session)).toBeNull();
  });

  it('emits the stored override when one is persisted for its allergenId', async () => {
    const allergenId = 'emits-stored';
    const ladder = makeLadder(allergenId);
    const session = createLadderOverrideSession(allergenId);
    await db.ladder_overrides.put(ladder);
    const value = await waitFor(session, (v) => v?.allergenId === allergenId);
    expect(value).toEqual(ladder);
  });

  it('is scoped to its allergenId — overrides for a different allergen do not appear', async () => {
    const other = 'scope-other';
    await db.ladder_overrides.put(makeLadder(other));
    const session = createLadderOverrideSession('scope-target');
    // Give liveQuery time to settle before asserting nothing arrived.
    await new Promise((r) => setTimeout(r, 100));
    expect(get(session)).toBeNull();
  });
});
