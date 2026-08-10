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

/** Source path of the Dexie singleton, as the dev server serves it. */
const DB_MODULE = '/src/lib/db/atopic-db.ts';

/**
 * Resolve the URL the running app actually imported a source module under.
 *
 * `import('/src/lib/db/atopic-db.ts')` inside `page.evaluate` looks like it
 * reaches the app's module — and does, until Vite invalidates the module and
 * starts serving it to the app as `…/atopic-db.ts?t=<timestamp>`. The query is
 * part of the URL, so the bare path then evaluates to a *second* module
 * instance with its own `AtopicDb`: seeding still works (both talk to the same
 * IndexedDB database, and Dexie's mutation events are global), but a test that
 * monkey-patches `db.meals.put` patches a copy the app never calls.
 *
 * Vite adds `?t=` after any edit to the module's graph, and the dev server is
 * reused between local runs (`reuseExistingServer`), so this bites whenever
 * `just test-e2e` follows an edit — and never in CI, which starts a clean
 * server. Reading the URL back off the resource timeline pins the instance the
 * app holds either way.
 */
export async function appModuleUrl(page: Page, sourcePath = DB_MODULE): Promise<string> {
  return page.evaluate((path) => {
    const entry = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((name) => new URL(name, location.origin).pathname === path);
    return entry ?? path;
  }, sourcePath);
}

/** Today in the browser's local timezone — matches how the app resolves "today". */
export function localToday(): string {
  return isoDaysFromToday(0);
}

/**
 * A local-ISO date `offset` days from today (negative for the past). Built off
 * the local calendar the same way {@link localToday} is, so a strip range keyed
 * on the browser's "today" and a seeded date never drift across a UTC boundary.
 */
export function isoDaysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Log a single meal on `date` via the app's own Dexie instance so the
 * earliest-logged `liveQuery` reacts and the strip grows without a reload.
 * Routes through {@link appModuleUrl} so the write and any monkey-patch land on
 * the exact module instance the app holds (see that function's note).
 */
export async function seedMeal(page: Page, date: string): Promise<void> {
  await page.evaluate(
    async ({ path, date }) => {
      const { db } = await import(/* @vite-ignore */ path);
      await db.meals.put({
        id: `${date}:lunch:mother`,
        date,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
        createdAt: `${date}T12:00:00.000Z`,
      });
    },
    { path: await appModuleUrl(page), date },
  );
}

/**
 * Wipe every table via Dexie's API so `liveQuery` subscriptions react to the
 * change — raw IDB writes bypass Dexie's mutation tracking and do NOT trigger
 * `liveQuery`. Reads the live table list for the same reason `resetDatabase()`
 * does: a table added by a future migration is covered without an edit here.
 */
export async function clearDb(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const { db } = await import(/* @vite-ignore */ path);
    await Promise.all(db.tables.map((table: { clear(): Promise<void> }) => table.clear()));
  }, await appModuleUrl(page));
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
  await page.evaluate(
    async ({ path, feedingStage }) => {
      const { db } = await import(/* @vite-ignore */ path);
      await db.settings.put({ id: 'singleton', feedingStage });
    },
    { path: await appModuleUrl(page), feedingStage: stage },
  );
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
