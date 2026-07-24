import { get } from 'svelte/store';

import { afterEach, describe, expect, it } from 'vitest';

import { SINGLETON_ID, db } from '$lib/db/atopic-db';

// The settings store is a liveQuery shell over the settings singleton, mirroring
// scheduleContext. We drive it by writing the singleton row and observing what
// the store emits — the public boundary consumers read.

async function waitFor<T>(
  store: { subscribe: (cb: (v: T) => void) => () => void },
  predicate: (v: T) => boolean,
  timeoutMs = 600,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for settings store value'));
    }, timeoutMs);
    unsub = store.subscribe((v) => {
      if (predicate(v)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(v);
      }
    });
  });
}

afterEach(async () => {
  await db.settings.clear();
});

describe('settingsContext', () => {
  it('starts as null before any settings are seeded', async () => {
    const { settingsContext } = await import('./settings-context');
    expect(get(settingsContext)).toBeNull();
  });

  it('emits the seeded feedingStage once the singleton row exists', async () => {
    const { settingsContext } = await import('./settings-context');

    await db.settings.put({ id: SINGLETON_ID, feedingStage: 'solids' });

    const value = await waitFor(settingsContext, (v) => v?.feedingStage === 'solids');
    expect(value).toEqual({ feedingStage: 'solids' });
  });

  it('reflects a live change to the stored feedingStage', async () => {
    const { settingsContext } = await import('./settings-context');

    await db.settings.put({ id: SINGLETON_ID, feedingStage: 'breastfed' });
    await waitFor(settingsContext, (v) => v?.feedingStage === 'breastfed');

    await db.settings.put({ id: SINGLETON_ID, feedingStage: 'mixed' });
    const value = await waitFor(settingsContext, (v) => v?.feedingStage === 'mixed');
    expect(value).toEqual({ feedingStage: 'mixed' });
  });
});
