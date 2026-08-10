import { test, expect } from '@playwright/test';

import { clearDb, startLogging } from './seed';

/**
 * Meal page header E2E (issue #278).
 *
 * Two visual contracts on `/meal`:
 *   1. The grid-state header shows the **meal-type label only** ("Oběd",
 *      "Snídaně", …) in the large `.page-heading` style — same prominence
 *      as "Dnes" on the day page. No emoji on the grid title.
 *   2. The destructive "Smazat jídlo" confirm button uses `bg-primary`
 *      (wine), not `bg-danger` (red). Per DESIGN.md, red is reserved for
 *      allergen / skin-state meaning; the confirm-sheet copy + the undo
 *      toast already carry destructiveness.
 *
 * The drill-in (family) title — `🥛 Mléko` etc. — is asserted under the
 * same large variant to lock in the AC bullet that the drill-in header
 * still renders correctly.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('grid-state header shows the meal-type label only ("Oběd"), in the large style', async ({ page }) => {
  await startLogging(page);

  // Open the FAB submenu → pick lunch → land on `/meal?type=lunch`.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  // The h1 text is the meal-type label, with no emoji prefix and no
  // "Přidat jídlo" anywhere on the page.
  const heading = page.locator('h1');
  await expect(heading).toHaveText('Oběd');
  await expect(page.getByText('Přidat jídlo')).toHaveCount(0);

  // The heading carries the `.page-heading` token — same style as "Dnes".
  await expect(heading).toHaveClass(/page-heading/);
  await expect(heading).not.toHaveClass(/body-bold/);
});

test('drill-in header still renders icon + family name under the large variant', async ({ page }) => {
  await startLogging(page);

  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  // Drill into Mléko. The drill-in title is `🥛 Mléko` and stays in the
  // large style — locks the AC bullet "drill-in (family) title still
  // renders correctly under the large variant".
  await page.getByRole('button', { name: /Mléko/ }).click();
  const heading = page.locator('h1');
  await expect(heading).toContainText('Mléko');
  await expect(heading).toContainText('🥛');
  await expect(heading).toHaveClass(/page-heading/);
});

test('Smazat jídlo confirm button uses bg-primary (bordeaux), not bg-danger (red)', async ({ page }) => {
  await startLogging(page);

  // Seed a saved lunch so the ⋯ overflow renders. Same shortest path as
  // meal-lifecycle.test.ts: FAB → lunch → Mléko → Kravské mléko → save.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  const today = new Date().toISOString().split('T')[0];
  await page.waitForURL(`**/day/${today}`);

  // Re-enter edit mode, open the ⋯ overflow, and pick "Smazat jídlo" to open
  // the destructive-confirm sheet.
  await page.getByTestId('meal-row-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByTestId('overflow-delete').click();

  // The confirm sheet's "Smazat jídlo" button is bordeaux (bg-primary), not red.
  const deleteBtn = page
    .getByRole('dialog', { name: 'Smazat jídlo?' })
    .getByRole('button', { name: 'Smazat jídlo' });
  await expect(deleteBtn).toBeVisible();
  await expect(deleteBtn).toHaveClass(/bg-primary/);
  await expect(deleteBtn).not.toHaveClass(/bg-danger/);
});
