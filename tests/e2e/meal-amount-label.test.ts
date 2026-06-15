/**
 * E2E: Czech amount + preparation rendering on the /meal working list (#279).
 *
 * AC: the confirmed-food row prints the Czech portion `.label` (e.g. "Lžíce"),
 * never the raw `PortionKind` key ("spoon") nor the abbreviated `.short`
 * ("lžíce" — lowercase, mixed forms). When a preparation is set, it appears
 * as a muted "· {preparation label}" suffix; otherwise the suffix is absent.
 */

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
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (start) => {
    const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: start,
      completedAt: new Date().toISOString(),
      testedAllergens: [],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: future,
      phases: [{ id: 'reset', type: 'reset', allergenIds: [], startDate: start, endDate: future }],
    });
  }, today);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await completeOnboarding(page);
});

test('confirmed-food row renders Czech portion label "Lžíce" — never the raw key or .short form', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);

  // Drill into Zelenina (vegetables) → Brambory (no allergens, always selectable).
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: /Brambory/ }).click();
  // Pick the "Lžíce" portion chip.
  await page.getByRole('button', { name: 'Lžíce', exact: true }).click();
  // Confirm the food, then commit the family to return to the grid.
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  // Working-list row should show the food name and the Czech label.
  const row = page.locator('[data-food-token]').filter({ hasText: 'Brambory' }).first();
  await expect(row).toContainText('Lžíce');
  // Negative checks: no raw key, no lowercase short form.
  await expect(row).not.toContainText(/\bspoon\b/);
  // The row must not contain the lowercase short form "lžíce" as a standalone
  // word. (The label "Lžíce" is capitalized, so a case-sensitive negative match
  // on the boundary-anchored lowercase token is enough.)
  const text = (await row.textContent()) ?? '';
  expect(text).not.toMatch(/\blžíce\b/);
});

test('confirmed-food row appends "· Vařené" when a preparation is set, omits the dot when not', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);

  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: 'Lžíce', exact: true }).click();
  await page.getByRole('button', { name: 'Vařené', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  // Now confirm a second food without a preparation in the same family.
  await page.getByRole('button', { name: /Cuketa/ }).click();
  await page.getByRole('button', { name: 'Porce', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Cuketa/ }).click();

  // Commit family → back to grid.
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  const row = page.locator('[data-food-token]').filter({ hasText: 'Brambory' }).first();
  await expect(row).toContainText(/Lžíce\s*·\s*Vařené/);

  const rowNoPrep = page.locator('[data-food-token]').filter({ hasText: 'Cuketa' }).first();
  await expect(rowNoPrep).toContainText('Porce');
  const noPrepText = (await rowNoPrep.textContent()) ?? '';
  expect(noPrepText).not.toContain('·');
});
