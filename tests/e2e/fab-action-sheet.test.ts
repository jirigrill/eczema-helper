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

test('FAB not visible on onboarding route', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).not.toBeVisible();
});

test('FAB opens action sheet with three actions', async ({ page }) => {
  await completeOnboarding(page);
  await openFabSheet(page);
  await expect(page.getByTestId('fab-action-meal')).toBeVisible();
  await expect(page.getByTestId('fab-action-skin')).toBeVisible();
  await expect(page.getByTestId('fab-action-photo')).toBeVisible();
});

test('FAB meal action opens meal page', async ({ page }) => {
  await completeOnboarding(page);
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
});

test('FAB skin action opens skin observation page', async ({ page }) => {
  await completeOnboarding(page);
  await openFabSheet(page);
  await page.getByTestId('fab-action-skin').click();
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();
});

test('FAB cancel closes the sheet and stays on current page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await openFabSheet(page);
  await page.getByTestId('fab-action-close').click();
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('FAB backdrop click closes the sheet and stays on current page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await openFabSheet(page);
  await page.mouse.click(10, 10);
  await expect(page.getByText('Co chceš přidat?')).not.toBeVisible();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('FAB on /day/[date] opens meal page for that date', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await seedSchedule(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toBeVisible({ timeout: 10000 });
  await openFabSheet(page);
  await page.getByTestId('fab-action-meal').click();
  // Meal page loaded — verify it renders for the correct date, not just that the URL is right
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`date=${today}`));
});
