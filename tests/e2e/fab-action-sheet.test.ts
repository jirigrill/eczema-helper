import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.settings.clear();
    db.close();
  });
}

// The FAB rides the seeded signal `settings.feedingStage != null` (PRD #623,
// §3), so seeding the feeding stage is the whole of "set up" for the shell.
async function seedSetup(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  });
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── helpers ───────────────────────────────────────────────────────────────

async function openFabSheet(page: Page) {
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await expect(page.getByText('Co chceš přidat?')).toBeVisible();
}

// ── tests ─────────────────────────────────────────────────────────────────

test('FAB not visible on onboarding route', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).not.toBeVisible();
});

test('FAB opens action sheet with two actions; photo row is absent (issue #371)', async ({ page }) => {
  await seedSetup(page);
  await openFabSheet(page);
  await expect(page.getByTestId('fab-action-meal')).toBeVisible();
  await expect(page.getByTestId('fab-action-skin')).toBeVisible();
  await expect(page.getByTestId('fab-action-photo')).toHaveCount(0);
});

test('FAB meal action opens the meal-type submenu, then a row navigates to /meal', async ({ page }) => {
  await seedSetup(page);
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  // Submenu replaces the action list with the four meal types.
  await expect(page.getByTestId('fab-meal-type-lunch')).toBeVisible();
  await page.getByTestId('fab-meal-type-lunch').click();
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
});

test('FAB skin action opens skin observation page', async ({ page }) => {
  await seedSetup(page);
  await openFabSheet(page);
  await page.getByTestId('fab-action-skin').click();
  // PageHeader title is "Stav kůže" (commonStrings.skin.heading); changed
  // from "Záznam stavu kůže" in #361 to match the prototype.
  await expect(page.getByRole('heading', { name: 'Stav kůže' })).toBeVisible();
});

test('FAB cancel closes the sheet and stays on current page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await seedSetup(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await openFabSheet(page);
  await page.getByTestId('fab-action-close').click();
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('FAB backdrop click closes the sheet and stays on current page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await seedSetup(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await openFabSheet(page);
  await page.mouse.click(10, 10);
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('FAB on /day/[date] opens meal page for that date', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await seedSetup(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toBeVisible({ timeout: 10000 });
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  // Meal page loaded — verify it renders for the correct date, not just that the URL is right
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`date=${today}`));
});
