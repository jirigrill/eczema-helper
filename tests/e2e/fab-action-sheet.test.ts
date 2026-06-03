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

async function seedSchedule(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (start) => {
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
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

// ── helpers ───────────────────────────────────────────────────────────────

async function openFabSheet(page: Page) {
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await expect(page.getByText('Co chceš přidat?')).toBeVisible();
}

// ── tests ─────────────────────────────────────────────────────────────────

test('FAB opens action sheet on /today', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await openFabSheet(page);
});

test('FAB not visible on onboarding route', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).not.toBeVisible();
});

test('FAB meal action navigates to /meal with today date', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  await expect(page).toHaveURL(`/meal?date=${today}&returnTo=/day/${today}`);
});

test('FAB skin action navigates to /skin with today date', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await openFabSheet(page);
  await page.getByTestId('fab-action-skin').click();
  await expect(page).toHaveURL(`/skin?date=${today}&returnTo=/day/${today}`);
});

test('FAB cancel closes the sheet without navigating', async ({ page }) => {
  await completeOnboarding(page);
  await openFabSheet(page);
  await page.getByTestId('fab-action-close').click();
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL('/today');
});

test('FAB backdrop click closes the sheet without navigating', async ({ page }) => {
  await completeOnboarding(page);
  await openFabSheet(page);
  // Click the dimmed backdrop (top-left corner, outside the sheet)
  await page.mouse.click(10, 10);
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL('/today');
});

test('FAB on /day/[date] passes correct date to meal action', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await seedSchedule(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toBeVisible({ timeout: 10000 });
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  await expect(page).toHaveURL(`/meal?date=${today}&returnTo=/day/${today}`);
});
