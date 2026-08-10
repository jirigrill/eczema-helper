import { afterEach, describe, expect, it } from 'vitest';

import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import { resetDatabase } from '$lib/db/reset-database';

// resetDatabase() is the factory wipe behind the Settings "Restartovat" button.
// Its predecessor cleared four tables by name and silently spared the five
// holding the mother's meals, skin observations and photos, while the Czech
// copy promised to erase everything. These specs pin the promise.

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('resetDatabase', () => {
  it('clears the tables holding the mother logged data', async () => {
    await db.meals.put({
      id: '2026-08-05:lunch:mother',
      date: '2026-08-05',
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await db.skin_observations.put({
      id: 'obs-1',
      date: '2026-08-05',
      regions: [],
      createdAt: new Date().toISOString(),
    });
    await db.photos.put({
      id: 'photo-1',
      observationId: 'obs-1',
      blob: new Blob(['x']),
      region: 'face',
      capturedAt: new Date().toISOString(),
    });
    await db.settings.put({ id: SINGLETON_ID, feedingStage: 'breastfed' });

    await resetDatabase();

    expect(await db.meals.count()).toBe(0);
    expect(await db.skin_observations.count()).toBe(0);
    expect(await db.photos.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });

  // The bug being fixed was an out-of-date list of table names, so the
  // guarantee under test is "every table", not "these nine tables".
  it('leaves no row in any declared table', async () => {
    await Promise.all(
      db.tables.map((table) => {
        const key = table.schema.primKey.keyPath;
        return table.put(typeof key === 'string' ? { [key]: 'seed-row' } : { id: 'seed-row' });
      }),
    );
    const seeded = await Promise.all(db.tables.map((table) => table.count()));
    expect(seeded.every((count) => count > 0)).toBe(true);

    await resetDatabase();

    const counts = await Promise.all(db.tables.map((table) => table.count()));
    expect(counts).toEqual(db.tables.map(() => 0));
  });

  it('is safe to run against an already-empty database', async () => {
    await expect(resetDatabase()).resolves.toBeUndefined();
  });
});
