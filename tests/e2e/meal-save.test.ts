import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { appModuleUrl, clearDb, seedFeedingStage, startLogging } from './seed';

/** Confirm one food (Brambory from Zelenina) and commit the family. */
async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  // Per-test isolation gives a fresh context with an empty IndexedDB, so the
  // extra reload to "reset" state is redundant — goto + clear is enough.
  await page.goto('/');
  await clearDb(page);
});

// ── Core save flow ────────────────────────────────────────────────────────────

test('meal save: add a food via drill-in, hit Hotovo, navigates to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await startLogging(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);

  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('liveQuery: meal saved on /meal appears on /day/<today> without reload', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await startLogging(page);

  // Lunch slot starts empty — no foods rendered in its row.
  const lunchRow = page.getByTestId('meal-row-lunch');
  await expect(lunchRow).toBeVisible();
  await expect(lunchRow).not.toContainText('Brambory');

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Brambory');
});

// ── Save failure: surfaced, not silently lost ─────────────────────────────────

test('meal save failure: shows an error toast and stays on /meal', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await startLogging(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Force the next persistence write to throw, driving DexieMealRepository.save
  // into its catch branch (Result.ok === false). The meal page imports the same
  // db singleton, so patching db.meals.put here affects the real save path.
  await page.evaluate(async (path) => {
    const { db } = await import(/* @vite-ignore */ path);
    db.meals.put = () => Promise.reject(new Error('QuotaExceededError'));
  }, await appModuleUrl(page));

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  // Error surfaced and the user is NOT navigated away — the working meal survives.
  await expect(page.getByRole('alert')).toContainText('QuotaExceededError');
  await expect(page).toHaveURL(/\/meal/);
});

// ── Slice 4c: ?date= query parameter ─────────────────────────────────────────

test('?date= param: saves to specified date, navigates to /day/<date>', async ({ page }) => {
  await seedFeedingStage(page);

  await page.goto('/meal?type=breakfast&date=2025-01-15');
  await expect(page.getByRole('heading', { name: 'Snídaně' })).toBeVisible();

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Snídaně/ }).click();

  await expect(page).toHaveURL('/day/2025-01-15');
  await expect(page.getByText('Brambory')).toBeVisible();
});
