import type { Page } from '@playwright/test';

/**
 * Shared IndexedDB setup for the e2e suite.
 *
 * Every spec starts from the same two primitives: an empty database and a
 * seeded feeding stage. Before PRD #623 each spec carried its own copy of a
 * `completeOnboarding` helper that also wrote `answers` and `schedule` rows;
 * those tables are now dormant placeholders (see `docs/parked-features.md`),
 * so the seed is a single `settings` row and lives here once.
 */

export type FeedingStage = 'breastfed' | 'mixed' | 'solids';

/** Today in the browser's local timezone — matches how the app resolves "today". */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Wipe every table via Dexie's API so `liveQuery` subscriptions react to the
 * change — raw IDB writes bypass Dexie's mutation tracking and do NOT trigger
 * `liveQuery`. Reads the live table list for the same reason `resetDatabase()`
 * does: a table added by a future migration is covered without an edit here.
 */
export async function clearDb(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Use a variable so TypeScript doesn't try to statically resolve this
    // Vite dev-server path as a Node module.
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await Promise.all(db.tables.map((table: { clear(): Promise<void> }) => table.clear()));
    db.close();
  });
}

/**
 * Seed the whole of "the app is set up": the live feeding-stage master switch
 * (#567), which is also the seeded signal the layout gates its redirect on
 * (PRD #623, §3). Does not navigate. Returns today's ISO date.
 */
export async function seedFeedingStage(
  page: Page,
  stage: FeedingStage = 'breastfed',
): Promise<string> {
  await page.evaluate(async (feedingStage) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.settings.put({ id: 'singleton', feedingStage });
  }, stage);
  return localToday();
}

/**
 * {@link seedFeedingStage} plus a landing on today's day view — the state a
 * user is in after first run. Returns today's ISO date.
 */
export async function startLogging(
  page: Page,
  stage: FeedingStage = 'breastfed',
): Promise<string> {
  const today = await seedFeedingStage(page, stage);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
  return today;
}
