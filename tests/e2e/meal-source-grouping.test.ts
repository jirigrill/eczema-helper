/**
 * E2E tests for PRD #311 — the two meal-log family drill-in features:
 *   1. Food-source subgroup grouping (#315, ADR-0019)
 *   2. Per-food preparation form gating (#316)
 *
 * Selectors:
 *  - Source-group header:  <span> with exact text (e.g. 'Kravské') — disambiguated
 *    from food buttons (accessible name 'Kravské mléko') via { exact: true }.
 *  - FoodTile button:      getByRole('button', { name })
 *  - FoodEditor sections:  text 'Množství' / 'Příprava'
 *  - Preparation chips:    getByRole('button', { name: 'Syrové' | 'Vařené' | … })
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, startLogging } from './seed';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function openMealAndDrill(page: Page, familyName: string) {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(familyName) }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ════════════════════════════════════════════════════════════════════════════
// Feature 1 — food-source subgroup grouping (#315)
// ════════════════════════════════════════════════════════════════════════════

test.describe('source-subgroup grouping', () => {
  test('large curated family (Mléko) shows source headers in authored order', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Mléko');

    const cow = page.getByText('Kravské', { exact: true });
    const sheep = page.getByText('Ovčí', { exact: true });
    const goat = page.getByText('Kozí', { exact: true });
    const plant = page.getByText('Rostlinné', { exact: true });

    await expect(cow).toBeVisible();
    await expect(sheep).toBeVisible();
    await expect(goat).toBeVisible();
    await expect(plant).toBeVisible();

    // Authored order: Kravské → Ovčí → Kozí → Rostlinné
    const order = await page.evaluate(() => {
      const text = (t: string) =>
        [...document.querySelectorAll('span')].find(e => e.textContent?.trim() === t)!;
      const k = text('Kravské'), o = text('Ovčí'), g = text('Kozí'), r = text('Rostlinné');
      const F = Node.DOCUMENT_POSITION_FOLLOWING;
      return [
        !!(k.compareDocumentPosition(o) & F),
        !!(o.compareDocumentPosition(g) & F),
        !!(g.compareDocumentPosition(r) & F),
      ];
    });
    expect(order).toEqual([true, true, true]);
  });

  test('plant milks render under the Rostlinné group', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Mléko');

    const plantHeader = page.getByText('Rostlinné', { exact: true });
    // Group container is the header's parent; its plant milks sit inside it.
    const plantSection = page.locator('div', { has: plantHeader }).first();
    await expect(plantSection.getByRole('button', { name: /Mandlové mléko/ })).toBeVisible();
  });

  test('unsourced food (Houby) lands in trailing Ostatní; no "bez alergenu"', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Zelenina');

    const ostatni = page.getByText('Ostatní', { exact: true });
    await expect(ostatni).toBeVisible();
    await expect(page.getByRole('button', { name: /Houby/ })).toBeVisible();
    await expect(page.getByText(/bez alergenu/i)).not.toBeVisible();

    // Ostatní follows the last authored group (Košťálová).
    const trailing = await page.evaluate(() => {
      const text = (t: string) =>
        [...document.querySelectorAll('span')].find(e => e.textContent?.trim() === t)!;
      const r = text('Košťálová'), o = text('Ostatní');
      return !!(r.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(trailing).toBe(true);
  });

  test('large uncurated family (Maso, ≥5 foods, no sources) renders flat', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Maso');

    await expect(page.getByRole('button', { name: /Kuřecí/ })).toBeVisible();
    await expect(page.getByText('Kořenová', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Rostlinné', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Ostatní', { exact: true })).not.toBeVisible();
  });

  test('small family (Vejce, <5 foods) renders flat with no headers', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Vejce');

    await expect(page.getByRole('button', { name: /Vejce/ }).last()).toBeVisible();
    await expect(page.getByText('Kravské', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Ostatní', { exact: true })).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Feature 2 — per-food preparation form gating (#316)
// ════════════════════════════════════════════════════════════════════════════

test.describe('preparation form gating', () => {
  test('liquid food (Kravské mléko) shows Syrové · Vařené · Pečené only', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Mléko');

    await page.getByRole('button', { name: /Kravské mléko/ }).click();
    await expect(page.getByText('Příprava')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Syrové', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vařené', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pečené', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Smažené', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Dušené', exact: true })).not.toBeVisible();
  });

  test('cookable food (Brambory) shows all four prep chips including Syrové', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Zelenina');

    await page.getByRole('button', { name: /Brambory/ }).click();
    await expect(page.getByText('Příprava')).toBeVisible();

    for (const chip of ['Syrové', 'Vařené', 'Pečené', 'Smažené']) {
      await expect(page.getByRole('button', { name: chip, exact: true })).toBeVisible();
    }
  });

  test('raw-only food (Okurka) shows only Syrové', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Zelenina');

    await page.getByRole('button', { name: /Okurka/ }).click();
    await expect(page.getByText('Příprava')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Syrové', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vařené', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Smažené', exact: true })).not.toBeVisible();
  });

  test('none food (Džus) shows no Příprava row at all', async ({ page }) => {
    await startLogging(page);
    await openMealAndDrill(page, 'Nápoje');

    await page.getByRole('button', { name: /Džus/ }).click();
    await expect(page.getByText('Množství')).toBeVisible();
    await expect(page.getByText('Příprava')).not.toBeVisible();
  });

  test('chosen preparation (Syrové) persists to the saved meal item', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await startLogging(page);
    await openMealAndDrill(page, 'Mléko');

    await page.getByRole('button', { name: /Kravské mléko/ }).click();
    await page.getByRole('button', { name: 'Syrové', exact: true }).click();
    await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
    await page.getByRole('button', { name: /Uložit Mléko/ }).click();
    await page.getByRole('button', { name: /Uložit Oběd/ }).click();

    await expect(page).toHaveURL(`/day/${today}`);

    const prep = await page.evaluate(async () => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      const meals = await db.meals.toArray();
      const item = meals.flatMap((m: { items: { foodId: string; preparationMethod?: string }[] }) => m.items)
        .find((i: { foodId: string }) => i.foodId === 'kravske-mleko');
      return item?.preparationMethod;
    });
    expect(prep).toBe('raw');
  });
});
