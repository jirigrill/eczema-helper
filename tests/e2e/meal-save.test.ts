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

test('meal save: add two foods, hit Hotovo, success toast appears and page navigates to /today', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Navigate to meal-add via the + link that passes returnTo
  await page.goto('/meal?returnTo=/today');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Empty-state basket visible initially
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();

  // Add first custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Add second custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Mrkev');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Hotovo button is active (not disabled)
  const hotovo = page.getByRole('button', { name: /Hotovo/ });
  await expect(hotovo).toHaveAttribute('aria-disabled', 'false');

  // Save the meal — expect navigation to /today
  await hotovo.click();
  await expect(page).toHaveURL('/today');
});

test('liveQuery: meal saved on /meal appears on /today without reload', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Today screen shows empty meals state before any meal is saved
  await expect(page.getByText('Zatím žádný záznam.')).toBeVisible();

  // Navigate to meal-add with returnTo=/today
  await page.goto('/meal?returnTo=/today');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Add a food item and save
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await page.getByRole('button', { name: /Hotovo/ }).click();

  // returnTo navigates us back to /today
  await expect(page).toHaveURL('/today');

  // The saved meal now appears in the live list — no manual reload needed
  await expect(page.getByText('Oběd')).toBeVisible();
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('meal item editing: tap item row, pick amount chip, pick preparation chip, subtitle reflects choices', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');

  // Add a custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Collapsed row shows default subtitle (no chip panel)
  await expect(page.getByText('Množství')).not.toBeVisible();
  await expect(page.getByText('Příprava')).not.toBeVisible();

  // Tap item row to expand
  const basketItem = page.locator('[data-testid="basket-item"]');
  const basketItemHeader = page.locator('[data-testid="basket-item-header"]');

  // Expand by tapping the header (header area is always above the chip panel)
  await basketItemHeader.click();
  await expect(page.getByText('uprav množství a přípravu')).toBeVisible();

  // All 5 Množství chips present (scoped inside basket item to avoid matching outer div[role="button"])
  await expect(basketItem.getByRole('button', { name: 'Špetka' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Porce' })).toBeVisible();

  // All 4 Příprava chips present
  await expect(basketItem.getByRole('button', { name: 'Vařené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Dušené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Pečené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Smažené' })).toBeVisible();

  // Pick amount 'Lžička'
  await basketItem.getByRole('button', { name: 'Lžička' }).click();

  // Pick preparation 'Vařené'
  await basketItem.getByRole('button', { name: 'Vařené' }).click();

  // Collapse by tapping the header again
  await basketItemHeader.click();
  await expect(page.getByText('uprav množství a přípravu')).not.toBeVisible();

  // Collapsed subtitle reflects chosen amount and preparation
  await expect(page.getByText(/lž\./)).toBeVisible();
  await expect(page.getByText(/vařené/i)).toBeVisible();
});

test('meal item remove and re-add: remove clears basket, re-adding restores it', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');

  // Add two foods
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  await page.fill('input[placeholder="Název potraviny…"]', 'Mrkev');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Remove Brambory — ✕ button is inside its basket item row
  const bramboRow = page.locator('[data-testid="basket-item"]').filter({ hasText: 'Brambory' });
  await bramboRow.getByRole('button', { name: '✕' }).click();
  await expect(page.getByText('Brambory')).not.toBeVisible();

  // Mrkev still present; Hotovo still enabled
  await expect(page.getByText('Mrkev')).toBeVisible();
  await expect(page.getByRole('button', { name: /Hotovo/ })).toHaveAttribute('aria-disabled', 'false');

  // Remove Mrkev — basket goes empty
  await page.locator('[data-testid="basket-item"]').getByRole('button', { name: '✕' }).click();
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hotovo' })).toHaveAttribute('aria-disabled', 'true');

  // Re-add Brambory
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Hotovo re-enabled; save works
  await expect(page.getByRole('button', { name: /Hotovo/ })).toHaveAttribute('aria-disabled', 'false');
  await page.getByRole('button', { name: /Hotovo/ }).click();
  await expect(page.getByText('✓ Jídlo uloženo')).toBeVisible();
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();
});
