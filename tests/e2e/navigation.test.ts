import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(() => indexedDB.deleteDatabase('atopic-helper'));
}

async function completeOnboarding(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL('/');

  // Step 1 — baby birth date
  await page.fill('input[type="date"]', '2025-01-01');
  await page.getByRole('button', { name: /Pokračovat|Další/i }).click();

  // Step 2 — eczema severity (moderate is pre-selected)
  await page.getByRole('button', { name: /Pokračovat|Další/i }).click();

  // Step 3 — mother allergies (skip)
  await page.getByRole('button', { name: /Pokračovat|Další/i }).click();

  // Step 4 — baby confirmed allergies (skip)
  await page.getByRole('button', { name: /Pokračovat|Další/i }).click();

  // Step 5 — allergens to test (pre-selected defaults, continue)
  await page.getByRole('button', { name: /Pokračovat|Další/i }).click();

  // Step 6 — program start date + submit
  await page.getByRole('button', { name: /Spustit program|Dokončit/i }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('redirect to / from /today when IndexedDB is empty', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL('/');
});

test('full onboarding → /today with nav header visible', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await expect(page.getByText('Dnes')).toBeVisible();
  await expect(page.getByText('Program')).toBeVisible();
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
