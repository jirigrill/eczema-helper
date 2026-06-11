import { test, expect, type Page } from '@playwright/test';

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

async function advanceToStep3(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  // Now on step 3 — mother allergies
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

test('step 3: family grid is shown (not allergen flat grid)', async ({ page }) => {
  await advanceToStep3(page);
  // FamilyGrid shows family tiles in 4-col grid
  await expect(page.getByRole('button', { name: /Mléko/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Vejce/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Luštěniny/ })).toBeVisible();
});

test('step 3: single-allergen family (Vejce) selects directly without drill', async ({ page }) => {
  await advanceToStep3(page);
  // Tap Vejce — single-allergen family, should toggle directly
  await page.getByRole('button', { name: /Vejce/ }).click();
  // Button count label should appear on Pokračovat (1 alergen)
  await expect(page.getByRole('button', { name: /Pokračovat.*1/ })).toBeVisible();
  // Drill-in: Sója chip should NOT be visible (no drill opened)
  await expect(page.getByRole('button', { name: /Sója/ })).not.toBeVisible();
});

test('step 3: multi-allergen family (Luštěniny) opens drill-in', async ({ page }) => {
  await advanceToStep3(page);
  await page.getByRole('button', { name: /Luštěniny/ }).click();
  // AllergenDrillIn should now be visible with Sója chip
  await expect(page.getByRole('button', { name: /Sója/ })).toBeVisible();
  // Drill-in back button (aria-label="Zpět", exact)
  await expect(page.getByRole('button', { name: 'Zpět', exact: true })).toBeVisible();
});

test('step 3 drill-in: selecting Sója and returning shows family as active', async ({ page }) => {
  await advanceToStep3(page);
  await page.getByRole('button', { name: /Luštěniny/ }).click();
  // Select Sója
  await page.getByRole('button', { name: /Sója/ }).click();
  // Return via Hotovo
  await page.getByRole('button', { name: /Hotovo/ }).click();
  // Grid: Luštěniny tile should now show active state
  const tile = page.getByRole('button', { name: /Luštěniny/ });
  await expect(tile).toHaveAttribute('data-state', 'active');
  // Pokračovat shows 1 alergen count
  await expect(page.getByRole('button', { name: /Pokračovat.*1/ })).toBeVisible();
});

test('full questionnaire: allergen ids flow into stored answers', async ({ page }) => {
  await advanceToStep3(page);
  // Select dairy (single-allergen collapse)
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: /Pokračovat/ }).click();

  // Step 4: baby allergies — skip
  await page.getByRole('button', { name: /Pokračovat/ }).click();

  // Step 5 + step 6
  await page.getByRole('button', { name: /Pokračovat/ }).click();
  await page.getByRole('button', { name: /Potvrdit a spustit program/ }).click();
  await page.waitForURL(/\/day\//);

  // Verify stored answers contain dairy in motherAllergies
  const stored = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    const answers = await db.answers.toArray();
    db.close();
    return answers[0];
  });
  expect(stored.motherAllergies).toContain('dairy');
});
