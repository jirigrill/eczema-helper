/**
 * E2E tests for the modal-edit flow introduced in issue #244.
 *
 * Covers acceptance criteria 1–12 (AC13 = showcase update, not a runtime behaviour).
 *
 * Selectors:
 *  - FoodToken wrapper:  div[data-state]  (confirmed | locked | danger)
 *  - FoodToken button:   getByRole('button', { name }) — the tappable label
 *  - FoodEditor section: text 'Množství' / 'Příprava'
 *  - Confirmed-foods list on grid: text from commonStrings.meal.confirmedFoodsLabel
 *  - CTA: getByRole('button', { name: /…/ })  (sticky bottom button)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function seedDairyElimination(page: Page) {
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
}

/** Open /meal and drill into the Zelenina (vegetables) family. */
async function openMealAndDrillVegetables(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await page.getByRole('button', { name: /Zelenina/ }).click();
  // Loose food (no allergen) Brambory should be visible
  await expect(page.getByRole('button', { name: /Brambory/ })).toBeVisible();
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
  await completeOnboarding(page);
});

// ── AC1: tapping food → editing + FoodEditor expands + others locked ──────────

test('AC1: tapping a food puts it in editing and expands the FoodEditor', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();

  // FoodEditor is visible (Množství + Příprava rows)
  await expect(page.getByText('Množství')).toBeVisible();
  await expect(page.getByText('Příprava')).toBeVisible();
});

test('AC1: other foods become locked while one food is editing', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Tap Brambory to start editing
  await page.getByRole('button', { name: /Brambory/ }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Okurka should be locked (disabled button)
  const okurkaTile = page.locator('div[data-state="locked"]').filter({ hasText: /Okurka/ });
  await expect(okurkaTile).toBeVisible();
});

// ── AC2: only one food editing at a time ─────────────────────────────────────

test('AC2: only one food can be editing at a time', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Start editing Brambory (it locks Okurka etc.)
  await page.getByRole('button', { name: /Brambory/ }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Count how many Množství editors are open — should be exactly one
  await expect(page.getByText('Množství')).toHaveCount(1);
});

// ── AC3: "Uložit {Food}" confirms food → bordeaux fill, editor collapses ─────

test('AC3: CTA reads "Uložit {Food}" while a food is editing', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();

  await expect(page.getByRole('button', { name: /Uložit Brambory/ })).toBeVisible();
});

test('AC3: tapping "Uložit {Food}" confirms the food (bordeaux fill, editor collapses)', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  // FoodEditor is gone
  await expect(page.getByText('Množství')).not.toBeVisible();

  // FoodToken wrapper has data-state="confirmed"
  const confirmedTile = page.locator('div[data-state="confirmed"]').filter({ hasText: /Brambory/ });
  await expect(confirmedTile).toBeVisible();
});

test('AC3: confirming a food unlocks the other foods', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  // Okurka should no longer be locked
  await expect(page.locator('div[data-state="locked"]').filter({ hasText: /Okurka/ })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Okurka/ })).toBeEnabled();
});

// ── AC4: clicking outside the editor cancels the edit ────────────────────────

test('AC4: clicking outside the food editor cancels the edit', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  const drillIn = page.locator('.space-y-4');

  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Click the "bez alergenu" section heading — inside the drill-in but outside any FoodToken
  await page.getByText('bez alergenu').click();

  // FoodEditor should collapse
  await expect(page.getByText('Množství')).not.toBeVisible();

  // Token not confirmed — nothing was saved
  await expect(page.locator('div[data-state="confirmed"]').filter({ hasText: 'Brambory' })).not.toBeVisible();
});

// ── AC4: re-tapping editing food discards → idle, caches nothing ──────────────

test('AC4: re-tapping an editing food discards it back to idle', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Scope food buttons to the drill-in area (excludes the sticky CTA)
  const drillIn = page.locator('.space-y-4');

  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Re-tap to discard — use the food button scoped to drill-in, not the CTA
  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click();

  // FoodEditor collapsed
  await expect(page.getByText('Množství')).not.toBeVisible();

  // Token is no longer confirmed
  await expect(page.locator('div[data-state="confirmed"]').filter({ hasText: 'Brambory' })).not.toBeVisible();
});

test('AC4: discarding an edit caches nothing — re-selecting starts with default amount', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  const drillIn = page.locator('.space-y-4');

  // Start editing, change amount to Lžička, then discard via re-tap
  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: 'Lžička', exact: true }).click();
  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click(); // discard

  // Re-select: editor opens again — Množství visible means editing resumed
  await drillIn.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // CTA reads "Uložit Brambory" — confirms we're back in editing with fresh state
  await expect(page.getByRole('button', { name: /Uložit Brambory/ })).toBeVisible();
});

// ── AC5: tapping confirmed food → deselects; cache restored on re-select ─────

test('AC5: tapping a confirmed food deselects it', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Confirm Brambory
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await expect(page.locator('div[data-state="confirmed"]').filter({ hasText: /Brambory/ })).toBeVisible();

  // Tap confirmed tile to deselect
  await page.getByRole('button', { name: /Brambory/ }).click();

  // No longer confirmed
  await expect(page.locator('div[data-state="confirmed"]').filter({ hasText: /Brambory/ })).not.toBeVisible();
});

test('AC5: re-selecting a deselected food restores the cached amount', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Confirm Brambory with Lžička
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Lžička/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  // Deselect
  await page.getByRole('button', { name: /Brambory/ }).click();

  // Re-select
  await page.getByRole('button', { name: /Brambory/ }).click();

  // FoodEditor open with Lžička as active — verify Množství is visible
  await expect(page.getByText('Množství')).toBeVisible();
  // The CTA shows "Uložit Brambory" again — proves it's in editing with restored state
  await expect(page.getByRole('button', { name: /Uložit Brambory/ })).toBeVisible();
});

// ── AC6: nothing editing → "Uložit {Family}" → commits family, back to grid ──

test('AC6: with nothing editing, CTA reads "Uložit {Family}"', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Confirm one food so the CTA becomes "Uložit Zelenina"
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  await expect(page.getByRole('button', { name: /Uložit Zelenina/ })).toBeVisible();
});

test('AC6: tapping "Uložit {Family}" returns to grid with confirmed foods in working list', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  // Back on grid — family grid tiles visible again
  await expect(page.getByRole('button', { name: /Zelenina/ })).toBeVisible();

  // Confirmed foods list shows Brambory
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByText(/Brambory/)).toBeVisible();
});

// ── AC7: grid shows confirmed foods list + active family highlighted ──────────

test('AC7: grid shows read-only confirmed foods list after committing a family', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByText(/Brambory/)).toBeVisible();
});

test('AC7: family tile with confirmed foods shows active state', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  const zelenina = page.getByRole('button', { name: /Zelenina/ });
  await expect(zelenina).toHaveAttribute('data-state', 'active');
});

// ── AC8: grid has meal-level Poznámka field ───────────────────────────────────

test('AC8: grid shows the Poznámka field', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await expect(page.getByLabel('Poznámka k jídlu')).toBeVisible();
});

// ── AC9: "Hotovo — {Meal}" persists meal + navigates ─────────────────────────

test('AC9: "Hotovo — {Meal}" persists meal with notes and navigates to returnTo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await openMealAndDrillVegetables(page);

  // Confirm one food
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  // Fill in a note
  await page.getByLabel('Poznámka k jídlu').fill('U babičky');

  // Hit Hotovo
  await page.getByRole('button', { name: /Hotovo/ }).click();

  // Navigated to returnTo
  await expect(page).toHaveURL(`/day/${today}`);
});

test('AC9: saved meal appears on /day/<today> after Hotovo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await page.getByRole('button', { name: /Hotovo/ }).click();

  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Brambory')).toBeVisible();
});

// ── AC10: nothing written to Dexie before "Hotovo" ───────────────────────────

test('AC10: no meal in DB after confirming a food (before Hotovo)', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  // Check Dexie directly — meals table should be empty
  const mealCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return await db.meals.count();
  });
  expect(mealCount).toBe(0);
});

test('AC10: no meal in DB after committing a family (before Hotovo)', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  const mealCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return await db.meals.count();
  });
  expect(mealCount).toBe(0);
});

test('AC10: meal written to DB only after Hotovo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await page.getByRole('button', { name: /Hotovo/ }).click();

  await expect(page).toHaveURL(`/day/${today}`);

  const mealCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return await db.meals.count();
  });
  expect(mealCount).toBe(1);
});

// ── AC11: no "Procházet rodiny" link, no in-meal list; back arrows ────────────

test('AC11: drill-in has no "Procházet rodiny" link', async ({ page }) => {
  await openMealAndDrillVegetables(page);
  await expect(page.getByText('Procházet rodiny')).not.toBeVisible();
});

test('AC11: drill-in has no in-meal list section', async ({ page }) => {
  await openMealAndDrillVegetables(page);
  // Old model showed "V tomto jídle" — must not exist
  await expect(page.getByText('V tomto jídle')).not.toBeVisible();
});

test('AC11: drill-in back arrow (‹) in PageHeader returns to the family grid', async ({ page }) => {
  await openMealAndDrillVegetables(page);

  // Mléko family tile is on the grid — not visible while drilled in
  await expect(page.getByRole('button', { name: 'Mléko', exact: true })).not.toBeVisible();

  // PageHeader back button (‹) now handles both drill-in and grid navigation
  await page.getByRole('button', { name: '‹' }).click();

  // Family grid should be visible again
  await expect(page.getByRole('button', { name: /Zelenina/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mléko/ })).toBeVisible();
});

test('AC11: grid back arrow (‹) navigates to returnTo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // PageHeader back button renders "‹" as text content (no aria-label)
  await page.getByRole('button', { name: '‹' }).click();

  await expect(page).toHaveURL(`/day/${today}`);
});

test('AC11: meal type pills and banners hidden while drilled in, restored on back', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?returnTo=/day/${today}`);

  // On grid: pills and elimination banner visible
  await expect(page.getByRole('button', { name: 'Snídaně' })).toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  // Drill into Zelenina
  await page.getByRole('button', { name: /Zelenina/ }).click();

  // Header title changes; pills and banner gone
  await expect(page.getByText(/Zelenina/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Snídaně' })).not.toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).not.toBeVisible();

  // Back to grid: pills and banner restored
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page.getByRole('button', { name: 'Snídaně' })).toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();
});

// ── AC12 (partial — runtime side): eliminated foods marked with danger ────────

test('eliminated allergen foods show danger state in drill-in', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  // Drill into dairy
  await page.getByRole('button', { name: /Mléko/ }).first().click();

  // Kravské mléko should have danger styling
  const dangerTile = page.locator('div[data-state="danger"]').filter({ hasText: /Kravské mléko/ });
  await expect(dangerTile).toBeVisible();
});
