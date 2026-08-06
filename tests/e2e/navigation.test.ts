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

test('first run → /day/<today> with the floating FAB visible and no bottom nav', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);
  // The single-screen shell (PRD #623, §3): the FAB is the sole global add
  // affordance and there is no bottom navigation bar or Týden tab.
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByText('Týden')).toHaveCount(0);
});

test('the "↩ Dnes" chip is absent on today, appears off today, and returns to today', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const past = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await completeFirstRun(page);
  await expect(page).toHaveURL(`/day/${today}`);

  // On today the chip is absent — it rides the header's isToday swap.
  await expect(page.getByTestId('back-to-today-chip')).toHaveCount(0);

  // A directly-navigated past day still renders its own cell (day-strip clamp),
  // so off-today the chip appears and returns the browser to today when tapped.
  await page.goto(`/day/${past}`);
  await expect(page.getByTestId('back-to-today-chip')).toBeVisible();
  await page.getByTestId('back-to-today-chip').click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByTestId('back-to-today-chip')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Restartovat' }).click();
  // The factory reset is destructive (every table, photos included), so it is
  // gated behind a ConfirmSheet. Both the page button and the sheet's confirm
  // carry the same label; the sheet's is the later one in the DOM.
  await expect(page.getByText('Opravdu restartovat?')).toBeVisible();
  await page.getByRole('button', { name: 'Restartovat' }).last().click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
});
