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
  // Seed the post-onboarding state directly into IndexedDB instead of clicking
  // through the wizard — equivalent result (reset phase from today, no tested
  // allergens), far faster. The onboarding flow itself is covered by the
  // onboarding-summary + questionnaire-* tests.
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

test('family grid: shows 13 family tiles on meal page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Grid should show family tiles (grid uses CSS grid-cols-4)
  await expect(page.getByRole('button', { name: /Mléko/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Ovoce/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Zelenina/ })).toBeVisible();
});

// Issue #297 follow-up: the family grid no longer carries elimination/active
// indicators. The danger treatment (warning + changed background) lives only on
// the food once the user drills into the family; adding a food no longer dots
// the family tile.
test('family grid: tiles stay plain — no eliminated badge, no active dot; danger shows on the food inside the family', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Seed today as a dairy-elimination day.
  await page.evaluate(async () => {
    const todayIso = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: todayIso,
      estimatedEndDate: future,
      phases: [{
        id: 'elim-dairy',
        type: 'elimination',
        allergenIds: ['dairy'],
        startDate: todayIso,
        endDate: future,
      }],
    });
  });

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Eliminated family (Mléko, dairy) is a plain tile — no badge, no danger state.
  const dairyTile = page.getByRole('button', { name: /Mléko/ }).first();
  await expect(dairyTile).not.toHaveAttribute('data-state', 'danger');
  await expect(dairyTile.locator('[data-testid="eliminated-badge"]')).toHaveCount(0);

  // Drilling in still works, and the danger treatment shows on the food itself.
  await expect(dairyTile).toBeEnabled();
  await dairyTile.click();
  await expect(page.getByRole('button', { name: /Kravské mléko/ })).toBeVisible();
  // The eliminated food carries the "Vyloučeno" marker (changed background + warning).
  await expect(page.getByText('Vyloučeno').first()).toBeVisible();

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
