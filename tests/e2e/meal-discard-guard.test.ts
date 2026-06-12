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
  await page.waitForURL(/\/day\//);
}

async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ── Discard guard: empty working list ─────────────────────────────────────────

test('discard guard: back with empty working list navigates immediately, no toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo zahozeno')).not.toBeVisible();
});

// ── Discard guard: non-empty working list ─────────────────────────────────────

test('discard guard: back with non-empty working list discards and shows toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Back arrow — should discard and navigate to /day/<today>
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  // Toast must appear on the destination screen (rendered by layout)
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();
});

// ── Discard undo: Zpět restores working list ──────────────────────────────────

test('discard guard: tapping Zpět on toast restores the working list', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Back — discard
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();

  // Tap "Zpět" on the toast
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);

  // The restored working list should contain the original food
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brambory' })).toBeVisible();
});
