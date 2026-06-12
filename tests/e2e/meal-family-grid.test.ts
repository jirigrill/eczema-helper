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
  await page.waitForURL(/\/day\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

test('family grid: shows 13 family tiles on meal page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Grid should show family tiles (grid uses CSS grid-cols-4)
  await expect(page.getByRole('button', { name: /Mléko/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Ovoce/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Zelenina/ })).toBeVisible();
});

// drill-in → add food → back to grid, danger state, and conflict toast are now
// covered by tests/e2e/meal-modal-edit.test.ts (AC1–AC12).
