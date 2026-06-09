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
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

test('alias resolution: typing a Czech alias in custom input adds canonical item, not other:', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Type a known alias for wheat ('pšenice') in the free-text input
  await page.fill('input[placeholder="Název potraviny…"]', 'pšenice');
  await page.getByRole('button', { name: 'Přidat' }).click();

  // The basket item should display the canonical Czech name, not the raw alias
  await expect(page.getByText('Pšenice / lepek').first()).toBeVisible();

  // The wheat category icon should appear (not the generic fallback 🍽️)
  await expect(page.getByText('🌾').first()).toBeVisible();

  // No basket item named 'pšenice' (the raw alias) should exist
  await expect(page.getByText('pšenice', { exact: true })).not.toBeVisible();

  // Save succeeds — navigates to /day/<today>
  await page.getByRole('button', { name: /Hotovo/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('alias resolution: unknown food creates custom item with fallback icon', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // 'Paprika' is now a canonical regional allergen — resolves to canonical record
  await page.fill('input[placeholder="Název potraviny…"]', 'Paprika');
  await page.getByRole('button', { name: 'Přidat' }).click();

  // Should show canonical Czech name
  await expect(page.getByText('Paprika / chilli').first()).toBeVisible();
  // Should show canonical icon, not the generic fallback 🍽️
  await expect(page.getByText('🌶️').first()).toBeVisible();
  await expect(page.getByText('🍽️')).not.toBeVisible();
});

test('alias resolution: truly unknown food still creates custom item with fallback icon', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL(`/day/${today}`);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await page.fill('input[placeholder="Název potraviny…"]', 'Špenát');
  await page.getByRole('button', { name: 'Přidat' }).click();

  await expect(page.getByText('Špenát')).toBeVisible();
  await expect(page.getByText('🍽️')).toBeVisible();
});
