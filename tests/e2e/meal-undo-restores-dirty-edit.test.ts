 
/**
 * E2E tests for issue #299: undo (Zpět) restores the *exact dirty edit*.
 *
 * The user adds an eliminated food, backs out to Today (discard toast), taps
 * Zpět — the meal screen must reopen with the food restored, the elimination
 * warning showing, "Uložit změny" enabled, and the meal still dirty. Backing
 * out *again* re-buffers and re-toasts (no silent loss).
 *
 * Complements `meal-dirty-discard.test.ts` (which covers clean back-out, the
 * delete toast, and createdAt preservation) by focusing on the dirtiness +
 * conflict re-injection invariants of the post-undo state.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.meals.clear();
    await db.settings.clear();
    db.close();
  });
}

async function completeOnboardingWithDairyElimination(page: Page) {
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
      testedAllergens: ['dairy'],
      feedingStage: 'breastfed',
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: future,
      phases: [{
        id: 'elim-dairy',
        type: 'elimination',
        allergenIds: ['dairy'],
        startDate: start,
        endDate: future,
      }],
    });
    // The meal page gates its schedule context on the live feedingStage master
    // switch (#567); onboarding seeds it, so tests bypassing onboarding must too.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  }, today);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
  return today;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Compose-new flow (no prior saved meal) ───────────────────────────────────
//
// User adds a food on a fresh slot, backs out, taps Zpět. The restored
// compose-new must keep the food and let the user save.

test('compose-new: undo of a draft restores the food and canFinalize stays true', async ({ page }) => {
  const today = await completeOnboardingWithDairyElimination(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);

  // Add a non-eliminated food: Brambory (vegetables).
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();

  // Back out — discard toast appears.
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo neuloženo')).toBeVisible();

  // Tap Zpět.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);

  // Restored food is in the working list and the finalize CTA is enabled.
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();
  const cta = page.getByRole('button', { name: /Uložit Oběd/ });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('aria-disabled', 'false');
});

// ── Edit flow with eliminated food (issue #299 core scenario) ────────────────
//
// The full PRD walk-through: a saved meal exists, the user adds an eliminated
// food, backs out, and taps Zpět. The restored screen must show the danger
// styling, an enabled "Uložit změny" button, and a second back-out must
// re-toast.

async function seedLunchWithBrambory(page: Page, date: string) {
  await page.evaluate(async (d) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${d}:lunch:mother`,
      date: d,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: '2025-06-13T08:00:00.000Z',
    });
  }, date);
}

test('edit + eliminated food: Zpět restores food, the meal stays dirty, "Uložit změny" enabled', async ({ page }) => {
  const today = await completeOnboardingWithDairyElimination(page);
  await seedLunchWithBrambory(page, today!);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  // Wait for hydration — the seeded food row appears.
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Add an eliminated food: Mléko → Kravské mléko.
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: /Kravské mléko/ }).first().click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  // Commit the family back to the grid.
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  // Back out — discard toast appears.
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Změny neuloženy')).toBeVisible();

  // Tap Zpět.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);

  // The eliminated food is restored.
  await expect(page.getByRole('button', { name: 'Kravské mléko', exact: true })).toBeVisible();
  // "Uložit změny" is enabled (meal reads dirty).
  const cta = page.getByRole('button', { name: 'Uložit změny' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('aria-disabled', 'false');
});

test('edit: a SECOND back-out after Zpět writes a fresh discard buffer (no silent loss of restored food)', async ({ page }) => {
  const today = await completeOnboardingWithDairyElimination(page);
  await seedLunchWithBrambory(page, today!);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Add Kravské mléko and back out.
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: /Kravské mléko/ }).first().click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page.getByText('Změny neuloženy')).toBeVisible();

  // Zpět rehydrates.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByRole('button', { name: 'Kravské mléko', exact: true })).toBeVisible();
  // Wait for dirty state to settle.
  await expect(page.getByRole('button', { name: 'Uložit změny' })).toHaveAttribute('aria-disabled', 'false');

  // Second back-out: a non-null buffer must be written carrying both foods —
  // proves the restored edit was still dirty and was not silently dropped.
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);

  const bufState = await page.evaluate(async () => {
    const path = '/src/lib/stores/discard-buffer.ts';
    const mod = await import(/* @vite-ignore */ path);
    return new Promise<unknown>((resolve) => {
      const unsub = mod.discardBuffer.subscribe((v: unknown) => { resolve(v); });
      unsub();
    });
  });
  expect(bufState).not.toBeNull();
  const buf = bufState as { kind: string; workingMeal: { families: { foods: { foodId: string }[] }[] } };
  expect(buf.kind).toBe('meal-edit');
  const foodIds = buf.workingMeal.families.flatMap((f) => f.foods.map((fd) => fd.foodId)).sort();
  expect(foodIds).toContain('kravske-mleko');
  expect(foodIds).toContain('brambory');
});
