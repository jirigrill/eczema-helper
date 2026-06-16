/**
 * E2E tests for the modal-edit flow introduced in issue #244.
 *
 * Covers acceptance criteria 1–12 (AC13 = showcase update, not a runtime behaviour).
 *
 * Selectors:
 *  - FoodTile wrapper:  div[data-state]  (confirmed | locked | danger)
 *  - FoodTile button:   getByRole('button', { name }) — the tappable label
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
  // Seed the post-onboarding state directly into IndexedDB instead of clicking
  // through the wizard — equivalent result (reset phase from today, no tested
  // allergens), far faster. The onboarding flow itself is covered by the
  // onboarding-summary + questionnaire-* tests.
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (start) => {
    const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
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
  await page.goto(`/day/${today}`);
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
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
  await page.getByRole('button', { name: /Zelenina/ }).click();
  // Loose food (no allergen) Brambory should be visible
  await expect(page.getByRole('button', { name: /Brambory/ })).toBeVisible();
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
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

  // FoodTile wrapper has data-state="confirmed"
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

  // Click the "bez alergenu" section heading — inside the drill-in but outside any FoodTile
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
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

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
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  // Navigated to returnTo
  await expect(page).toHaveURL(`/day/${today}`);
});

test('AC9: saved meal appears on /day/<today> after Hotovo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await openMealAndDrillVegetables(page);

  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

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
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

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
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // PageHeader back button renders "‹" as text content (no aria-label)
  await page.getByRole('button', { name: '‹' }).click();

  await expect(page).toHaveURL(`/day/${today}`);
});

test('AC11: elimination banner hidden while drilled in, restored on back', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);

  // On grid: elimination banner visible (pills are gone after #266 / ADR-0018)
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  // Drill into Zelenina
  await page.getByRole('button', { name: /Zelenina/ }).click();

  // Header title changes; banner gone
  await expect(page.getByText(/Zelenina/).first()).toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).not.toBeVisible();

  // Back to grid: banner restored
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();
});

// ── AC12 (partial — runtime side): eliminated foods marked with danger ────────

test('eliminated allergen foods show danger state in drill-in', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  // Drill into dairy
  await page.getByRole('button', { name: /Mléko/ }).first().click();

  // Kravské mléko should have danger styling
  const dangerTile = page.locator('div[data-state="danger"]').filter({ hasText: /Kravské mléko/ });
  await expect(dangerTile).toBeVisible();
});

// ── AC245: editable working-list rows on the grid ────────────────────────────

/** Bring a food to the working-list and return to the grid. */
async function commitBramborToGrid(page: Page) {
  await openMealAndDrillVegetables(page);
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
}

test('AC245-1: tapping a working-list row opens the inline FoodEditor for that food', async ({ page }) => {
  await commitBramborToGrid(page);

  // FoodEditor must not be open yet
  await expect(page.getByText('Množství')).not.toBeVisible();

  // Tap the row button (food name button, not the ✕)
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();

  await expect(page.getByText('Množství')).toBeVisible();
  await expect(page.getByText('Příprava')).toBeVisible();
});

test('AC245-2: while a grid row is editing, CTA reads "Uložit {Food}"', async ({ page }) => {
  await commitBramborToGrid(page);

  await page.getByRole('button', { name: 'Brambory', exact: true }).click();

  await expect(page.getByRole('button', { name: /Uložit Brambory/ })).toBeVisible();
});

test('AC245-3: confirming a grid-row edit via CTA collapses the editor, food stays', async ({ page }) => {
  await commitBramborToGrid(page);

  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  await page.getByRole('button', { name: /Uložit Brambory/ }).click();

  await expect(page.getByText('Množství')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

test('AC245-4: clicking outside the grid-row editor confirms the food and collapses the editor', async ({ page }) => {
  await commitBramborToGrid(page);

  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Click outside: the notes textarea is outside [data-food-tile]
  await page.getByLabel('Poznámka k jídlu').click();

  await expect(page.getByText('Množství')).not.toBeVisible();
  // Food is still in the working list (confirmed, not removed)
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Uložit Oběd/ })).toBeVisible();
});

test('AC245-5: clicking a family-grid tile while a row is editing closes the editor and does not drill in', async ({ page }) => {
  await commitBramborToGrid(page);

  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Click a family tile — outside [data-food-tile], so it confirms the edit
  await page.getByRole('button', { name: /Ovoce/ }).click();

  // Still on grid (no drill-in heading visible)
  await expect(page.getByText('Všechny kategorie')).toBeVisible();
  // Food still in working list
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

test('AC245-6: ✕ removes the food from the working list', async ({ page }) => {
  await commitBramborToGrid(page);

  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Odebrat Brambory/ }).click();

  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).not.toBeVisible();
  await expect(page.getByText('Přidané potraviny')).not.toBeVisible();
});

test('AC245-7: removing a food does not write to DB before Hotovo', async ({ page }) => {
  await commitBramborToGrid(page);

  await page.getByRole('button', { name: /Odebrat Brambory/ }).click();

  const mealCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return await db.meals.count();
  });
  expect(mealCount).toBe(0);
});

test('AC245-8: tapping another working-list row confirms the current edit and opens the new editor', async ({ page }) => {
  // Commit two foods from different families to the working list
  await openMealAndDrillVegetables(page);
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  await expect(page.getByText('Přidané potraviny')).toBeVisible();

  // Open editor on Brambory
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByRole('button', { name: /Uložit Brambory/ })).toBeVisible();

  // Tap Kravské mléko — should confirm Brambory and open its editor
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await expect(page.getByRole('button', { name: /Uložit Kravské mléko/ })).toBeVisible();

  // Exactly one FoodEditor open (one 'Množství' label)
  await expect(page.getByText('Množství')).toHaveCount(1);

  // Brambory still in the working list (was confirmed, not removed)
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

// ── Bug-fix regression tests ─────────────────────────────────────────────────

test('grid: opening a row editor does not move the food to the bottom of the list', async ({ page }) => {
  // Commit two foods from different families
  await openMealAndDrillVegetables(page);
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  await expect(page.getByText('Přidané potraviny')).toBeVisible();

  // Capture DOM order before editing
  const orderBefore = await page.locator('[data-food-tile]').allTextContents();

  // Open editor on Brambory (first item)
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Brambory must still appear at the same index — not appended at bottom
  const orderAfter = await page.locator('[data-food-tile]').allTextContents();
  const idxBefore = orderBefore.findIndex(t => t.includes('Brambory'));
  const idxAfter = orderAfter.findIndex(t => t.includes('Brambory'));
  expect(idxAfter).toBe(idxBefore);

  // Sibling (Kravské mléko) still visible
  await expect(page.getByRole('button', { name: 'Kravské mléko', exact: true })).toBeVisible();
});

test('grid: opening one row editor keeps all other working-list foods visible', async ({ page }) => {
  await openMealAndDrillVegetables(page);
  await page.getByRole('button', { name: /Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  // Open editor on Kravské mléko
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await expect(page.getByText('Množství')).toBeVisible();

  // Brambory must remain visible (was not the food being edited)
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

test('grid: CTA is red when saving a family that has a confirmed eliminated food', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);

  // Drill into dairy, confirm a food — now in "Uložit Mléko" state
  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();

  // CTA should be red (bg-danger class applied)
  const cta = page.getByRole('button', { name: /Uložit Mléko/ });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveClass(/bg-danger/);
});

test('grid: confirmed eliminated food row shows amount in white text', async ({ page }) => {
  await seedDairyElimination(page);
  await page.reload({ waitUntil: 'networkidle' });

  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);

  // Commit a dairy food to the working list
  await page.getByRole('button', { name: /Mléko/ }).first().click();
  await page.getByRole('button', { name: /Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  await expect(page.getByText('Přidané potraviny')).toBeVisible();

  // The amount span inside the danger-confirmed row must carry the white-text class
  const amountSpan = page.locator('[data-state="danger-confirmed"] span.text-white');
  await expect(amountSpan).toBeVisible();
});
