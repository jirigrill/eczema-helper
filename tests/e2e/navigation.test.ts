import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Clear via Dexie's API so liveQuery subscriptions react to the change.
// Raw IDB writes bypass Dexie's mutation tracking and do NOT trigger liveQuery.
async function clearDb(page: Page) {
  await page.evaluate(async () => {
    // Use a variable so TypeScript doesn't try to statically resolve this
    // Vite dev-server path as a Node module.
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.settings.clear();
    db.close();
  });
}

// First run is a single screen (PRD #623, §3): a welcome + the feeding-stage
// picker + a confirm that writes the stage and lands on today. Breastfed is the
// v1 default, so confirming without touching a pill is a valid completion.
async function completeFirstRun(page: Page) {
  // beforeEach already navigated to / — just wait for the welcome screen.
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('redirect to / from /day/<today> when IndexedDB is empty', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/day/${today}`);
  await expect(page).toHaveURL('/');
});

test('first run → /day/<today> with bottom nav visible', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByRole('navigation').getByRole('link', { name: /Dnes/ })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: /Týden/ })).toBeVisible();
});

test('reactive redirect: clearing DB mid-session redirects to /', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  await clearDb(page);
  await expect(page).toHaveURL('/', { timeout: 5000 });
});

test('hard reload on /day/<today> after first run stays on /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(`/day/${today}`);
});

test('navigating back to / after first run redirects to /day/<today> (issue #353)', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  await page.goto('/');
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByRole('button', { name: 'Začít' })).not.toBeVisible();
});

test('reopening / on a fresh load after first run redirects to /day/<today> (issue #353)', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/');
  await expect(page).toHaveURL(`/day/${today}`);
});

test('settings reset flow lands on the first-run screen, not bounced back by the seeded redirect (issue #353)', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Restartovat dotazník' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
});
