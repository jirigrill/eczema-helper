import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, seedFeedingStage } from './seed';

async function seedMeal(page: Page, date: string, mealType: string) {
  await page.evaluate(
    async ({ date, mealType }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.meals.put({
        id: `${date}:${mealType}:mother`,
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
  await clearDb(page);
});

test('tapping an unlogged meal slot navigates to /meal with the slot type pre-selected', async ({ page }) => {
  const today = await seedFeedingStage(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toBeVisible();

  await page.getByTestId('meal-row-lunch').click();

  await expect(page).toHaveURL(/\/meal/);
  const url = page.url();
  expect(url).toContain('type=lunch');
  expect(url).toContain(`date=${today}`);
});

test('tapping a logged meal row navigates to /meal editor for that meal', async ({ page }) => {
  const today = await seedFeedingStage(page);
  await seedMeal(page, today!, 'breakfast');
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('meal-row-breakfast')).toBeVisible();

  await page.getByTestId('meal-row-breakfast').click();

  await expect(page).toHaveURL(/\/meal/);
  const url = page.url();
  expect(url).toContain('type=breakfast');
  expect(url).toContain(`date=${today}`);
});
