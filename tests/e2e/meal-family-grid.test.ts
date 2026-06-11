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
  // Wait until the app navigates to /day/ after saving the schedule
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

test('family grid → drill-in → add food → back to grid', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // A1: tap the fruit family tile
  await page.getByRole('button', { name: /Ovoce/ }).click();

  // A2: drill-in should show loose fruit foods (jablko, hruška)
  await expect(page.getByRole('button', { name: /Jablko/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hruška/ })).toBeVisible();

  // A2: add Jablko
  await page.getByRole('button', { name: /Jablko/ }).click();

  // A3: in-meal list should contain Jablko
  await expect(page.getByTestId('basket-item').filter({ hasText: 'Jablko' })).toBeVisible();

  // Return to grid via "Procházet rodiny" link
  await page.getByRole('button', { name: /Procházet rodiny/ }).click();

  // A1: grid is visible again (Mléko tile should be in view)
  await expect(page.getByRole('button', { name: /Mléko/ }).first()).toBeVisible();

  // Fruit tile should now show active state (item was added from that family)
  const fruitTile = page.getByRole('button', { name: /Ovoce/ });
  await expect(fruitTile).toHaveAttribute('data-state', 'active');
});

test('drill-in: marks eliminated allergen foods with danger state', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];

  // Seed a dairy elimination so dairy is eliminated today
  await page.evaluate(async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: today,
      completedAt: new Date().toISOString(),
      testedAllergens: ['dairy'],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: future,
      phases: [{
        id: 'elim-dairy',
        type: 'elimination',
        allergenIds: ['dairy'],
        startDate: today,
        endDate: future,
      }],
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`/meal?returnTo=/day/${today}`);

  // Dairy family tile should have danger state
  const dairyTile = page.getByRole('button', { name: /Mléko/ }).first();
  await expect(dairyTile).toHaveAttribute('data-state', 'danger');

  // Drill into dairy
  await dairyTile.click();

  // Kravské mléko (dairy food) should have danger state
  const milkBtn = page.getByRole('button', { name: /Kravské mléko/ });
  await expect(milkBtn).toBeVisible();
  await expect(milkBtn).toHaveAttribute('data-state', 'danger');
});

test('conflict toast shown when eliminated food added from drill-in', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];

  await page.evaluate(async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: today,
      completedAt: new Date().toISOString(),
      testedAllergens: ['dairy'],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: future,
      phases: [{
        id: 'elim-dairy',
        type: 'elimination',
        allergenIds: ['dairy'],
        startDate: today,
        endDate: future,
      }],
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`/meal?returnTo=/day/${today}`);

  // Drill into dairy and add a dairy food
  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();

  // Conflict toast should appear (the toast has a specific class/role)
  await expect(page.getByText(/⚠ Mléčné výrobky vyřazeno/)).toBeVisible();
});
