import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function seedSchedule(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
  await page.evaluate(
    async ({ start, future }) => {
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
    },
    { start: today, future }
  );
  return today;
}

async function seedMeal(page: Page, date: string, mealType: string) {
  await page.evaluate(
    async ({ date, mealType }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.meals.put({
        id: `${date}:${mealType}`,
        date,
        mealType,
        actor: 'mother',
        items: [{ id: 'i1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
        createdAt: new Date().toISOString(),
      });
    },
    { date, mealType }
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.meals.clear();
    db.close();
  });
});

test('tapping an unlogged meal slot navigates to /meal with the slot type pre-selected', async ({ page }) => {
  const today = await seedSchedule(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toBeVisible();

  await page.getByTestId('meal-row-lunch').click();

  await expect(page).toHaveURL(/\/meal/);
  const url = page.url();
  expect(url).toContain('type=lunch');
  expect(url).toContain(`date=${today}`);
});

test('tapping a logged meal row navigates to /meal editor for that meal', async ({ page }) => {
  const today = await seedSchedule(page);
  await seedMeal(page, today, 'breakfast');
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('meal-row-breakfast')).toBeVisible();

  await page.getByTestId('meal-row-breakfast').click();

  await expect(page).toHaveURL(/\/meal/);
  const url = page.url();
  expect(url).toContain('type=breakfast');
  expect(url).toContain(`date=${today}`);
});
