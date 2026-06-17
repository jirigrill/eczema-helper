import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Meal screen typography E2E (issue #302).
 *
 * Locks in the unified 3-style set on `/meal`:
 *   eyebrow  → section headers (V tomto jídle / Přidané potraviny,
 *              Všechny kategorie, Poznámka) + banner labels
 *   body     → food names, primary content
 *   caption  → date (top-right), porce/preparation meta, secondary banner text
 *
 * Lifts user stories 11 + 12 of #297: section headers + date share one
 * type rhythm; the date reads as quiet meta, not body content.
 */

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.meals.clear();
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
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: start, endDate: future },
      ],
    });
  }, today);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

async function openLunchMeal(page: Page) {
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);
}

test('"Všechny kategorie" header carries eyebrow with 12px / 600 / uppercase', async ({ page }) => {
  await completeOnboarding(page);
  await openLunchMeal(page);

  const header = page.getByText('Všechny kategorie', { exact: true });
  await expect(header).toHaveClass(/eyebrow/);
  await expect(header).toHaveCSS('font-size', '12px');
  await expect(header).toHaveCSS('font-weight', '600');
  await expect(header).toHaveCSS('text-transform', 'uppercase');
});

test('"Poznámka" notes label carries eyebrow', async ({ page }) => {
  await completeOnboarding(page);
  await openLunchMeal(page);

  const label = page.locator('label[for="meal-notes"]');
  await expect(label).toHaveClass(/eyebrow/);
  await expect(label).toHaveCSS('font-size', '12px');
  await expect(label).toHaveCSS('text-transform', 'uppercase');
});

test('"Přidané potraviny" working-list header carries eyebrow once a food is committed', async ({ page }) => {
  await completeOnboarding(page);
  await openLunchMeal(page);

  // Seed one confirmed food so the working-list section becomes visible.
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  const header = page.getByText('Přidané potraviny', { exact: true });
  await expect(header).toHaveClass(/eyebrow/);
  await expect(header).toHaveCSS('font-size', '12px');
  await expect(header).toHaveCSS('text-transform', 'uppercase');
});

test('date in the top-right reads as caption (11px / muted), not body', async ({ page }) => {
  await completeOnboarding(page);
  await openLunchMeal(page);

  // The header date uses the long Czech format ("X. měsíce"); locate inside
  // the sticky page-header next to the h1 ("Oběd").
  const date = page.locator('header, .sticky').first().locator('p.caption').first();
  await expect(date).toHaveCSS('font-size', '11px');
  // text-text-muted = #7A6468
  await expect(date).toHaveCSS('color', 'rgb(122, 100, 104)');
});

test('confirmed-row porce/preparation meta uses caption', async ({ page }) => {
  await completeOnboarding(page);
  await openLunchMeal(page);

  // Add and confirm a food so the meta line shows ("Porce").
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  // The amount/preparation text on the confirmed row carries `caption`.
  const meta = page.locator('[data-food-tile] span.caption').first();
  await expect(meta).toHaveCSS('font-size', '11px');
});
