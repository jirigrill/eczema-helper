import { describe, it, expect, afterEach } from 'vitest';
import { EczemaTrackerDB } from './dexie-db';

const EXPECTED_TABLES = [
  'children',
  'foodCategories',
  'foodSubItems',
  'foodLogs',
  'meals',
  'mealItems',
  'trackingPhotos',
  'analysisResults',
  'photoBlobs'
];

describe('EczemaTrackerDB', () => {
  let db: EczemaTrackerDB | undefined;

  afterEach(async () => {
    if (db?.isOpen()) {
      db.close();
    }
  });

  it('database opens without error', async () => {
    db = new EczemaTrackerDB();
    await expect(db.open()).resolves.not.toThrow();
  });

  it('all expected tables exist', async () => {
    db = new EczemaTrackerDB();
    await db.open();
    const tableNames = db.tables.map((t) => t.name);
    for (const table of EXPECTED_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it('FoodLogs compound index works', async () => {
    db = new EczemaTrackerDB();
    await db.open();

    const log = {
      id: 'log-1',
      childId: 'child-1',
      date: '2025-04-01',
      categoryId: 'cat-1',
      action: 'eliminated' as const,
      createdBy: 'user-1',
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };

    await db.foodLogs.add(log);

    const results = await db.foodLogs.where('[childId+date]').equals(['child-1', '2025-04-01']).toArray();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('log-1');
  });
});
