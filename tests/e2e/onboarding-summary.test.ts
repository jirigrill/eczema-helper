import { test, expect, type Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    db.close();
  });
}

async function navigateToSummaryStep(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  // Now on step 6 — summary
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('step 6 shows 5 QuestionnaireSummaryRow rows', async ({ page }) => {
  await navigateToSummaryStep(page);

  await expect(page.getByText('Shrnutí')).toBeVisible();
  // Each row has an "Upravit ›" affordance
  const editLinks = page.getByText('Upravit ›');
  await expect(editLinks).toHaveCount(5);
});

test('step 6 shows the correct row labels', async ({ page }) => {
  await navigateToSummaryStep(page);

  await expect(page.getByText('NAROZENÍ')).toBeVisible();
  await expect(page.getByText('ZÁVAŽNOST')).toBeVisible();
  await expect(page.getByText('MOJE ALERGIE')).toBeVisible();
  await expect(page.getByText('POTVRZENÉ ALERGIE MIMINKA')).toBeVisible();
  await expect(page.getByText('START · KONEC')).toBeVisible();
});

test('clicking "Upravit ›" on a row navigates back to the correct step', async ({ page }) => {
  await navigateToSummaryStep(page);

  // The first "Upravit ›" belongs to the birth-date row (step 2)
  const firstEditButton = page.getByText('Upravit ›').first();
  await firstEditButton.click();

  // Should now be on step 2 — the birthdate input is visible
  await expect(page.locator('#birthdate')).toBeVisible();
});
