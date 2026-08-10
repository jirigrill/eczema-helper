import { test, expect } from '@playwright/test';

import { clearDb, startLogging } from './seed';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('family grid: shows 13 family tiles on meal page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await startLogging(page);
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Grid should show family tiles (grid uses CSS grid-cols-4)
  await expect(page.getByRole('button', { name: /Mléko/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Ovoce/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Zelenina/ })).toBeVisible();
});

// Issue #297 follow-up: the family grid carries no elimination/active
// indicators. Adding a food no longer dots the family tile.
test('family grid: tiles stay plain — no eliminated badge, no active dot', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await startLogging(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Eliminated family (Mléko, dairy) is a plain tile — no badge, no danger state.
  const dairyTile = page.getByRole('button', { name: /Mléko/ }).first();
  await expect(dairyTile).not.toHaveAttribute('data-state', 'danger');
  await expect(dairyTile.locator('[data-testid="eliminated-badge"]')).toHaveCount(0);

  // Drilling in still works.
  await expect(dairyTile).toBeEnabled();
  await dairyTile.click();
  await expect(page.getByRole('button', { name: /Kravské mléko/ })).toBeVisible();

  // Back to the grid, add a vegetable so Zelenina has a confirmed food.
  await page.goBack();
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  // The family tile stays plain — no active dot appears just because a food was added.
  const veggieTile = page.getByRole('button', { name: /Zelenina/ });
  await expect(veggieTile).not.toHaveAttribute('data-state', 'active');
  await expect(veggieTile.locator('[data-testid="active-dot"]')).toHaveCount(0);
});

// drill-in → add food → back to grid, danger state, and conflict toast are now
// covered by tests/e2e/meal-modal-edit.test.ts (AC1–AC12).
