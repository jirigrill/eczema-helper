import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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

async function completeOnboarding(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

test('meal save: add two foods, hit Hotovo, success toast appears and basket clears', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Navigate to meal-add
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Empty-state basket visible initially
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();

  // Add first custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Add second custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Mrkev');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Hotovo button is active (not disabled)
  const hotovo = page.getByRole('button', { name: /Hotovo/ });
  await expect(hotovo).toHaveAttribute('aria-disabled', 'false');

  // Save the meal
  await hotovo.click();

  // Success toast appears
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('✓ Jídlo uloženo')).toBeVisible();

  // Basket is cleared — empty state back
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();

  // Saved meal visible in "Dnes uložená jídla" section
  await expect(page.getByText('Dnes uložená jídla')).toBeVisible();
  await expect(page.getByText('Brambory')).toBeVisible();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Toast link points to /today
  await expect(page.getByRole('link', { name: /přehled dne/i })).toHaveAttribute('href', '/today');
});
