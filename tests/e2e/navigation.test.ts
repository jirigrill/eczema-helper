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
    await db.answers.clear();
    await db.schedule.clear();
    db.close();
  });
}

async function completeOnboarding(page: Page) {
  // beforeEach already navigated to / — just wait for the welcome screen
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();

  // Step 1 — welcome screen
  await page.getByRole('button', { name: 'Začít' }).click();

  // Step 2 — baby birth date + severity (moderate pre-selected)
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();

  // Step 3 — mother allergies (skip)
  await page.getByRole('button', { name: 'Pokračovat' }).click();

  // Step 4 — baby confirmed allergies (skip)
  await page.getByRole('button', { name: 'Pokračovat' }).click();

  // Step 5 — program start date (pre-filled to today)
  await page.getByRole('button', { name: 'Pokračovat' }).click();

  // Step 6 — summary, confirm
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  // Full reload ensures Dexie reinitialises with the now-empty stores
  // and component state is fully reset.
  await page.reload({ waitUntil: 'networkidle' });
});

test('redirect to / from /today when IndexedDB is empty', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL('/');
});

test('full onboarding → /today with bottom nav visible', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await expect(page.getByRole('navigation').getByRole('link', { name: /Dnes/ })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: /Týden/ })).toBeVisible();
});

test('reactive redirect: clearing DB mid-session redirects to /', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  await clearDb(page);
  await expect(page).toHaveURL('/', { timeout: 5000 });
});

test('onboarding → /today shows phase and allergen columns', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Phase hero is present
  await expect(page.locator('a[href="/program"]').first()).toBeVisible();

  // Allergen columns
  await expect(page.getByText('✓ Smím')).toBeVisible();
  await expect(page.getByText('✗ Vyhýbej se')).toBeVisible();
});
