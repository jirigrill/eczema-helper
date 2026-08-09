/**
 * E2E tests for custom food entry inside the Vlastní drill-in (issue #248).
 *
 * Acceptance criteria covered:
 *  - AC1: Vlastní drill-in shows text input + "Přidat" + previously-typed harvest chips
 *  - AC2: typing new food + Přidat → editing flow (Množství visible, CTA = "Uložit {name}")
 *  - AC3: tapping an existing harvest chip enters modal-edit flow
 *  - AC4: new food captured to harvest-candidate store
 *  - AC5: standalone custom-food input is NOT present on the grid screen
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, startLogging } from './seed';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedHarvestCandidate(page: Page, normalizedKey: string, rawForm: string) {
  await page.evaluate(async ({ key, form }) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.harvest_candidates.put({
      normalizedKey: key,
      rawForms: [form],
      status: 'pending',
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }, { key: normalizedKey, form: rawForm });
}

async function openVlastniDrillIn(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
  await page.getByRole('button', { name: /Vlastní/ }).click();
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await startLogging(page);
});

// ── AC1: Vlastní drill-in shows text input + Přidat + harvest chips ───────────

test('AC1: Vlastní drill-in shows a text input and a Přidat button', async ({ page }) => {
  await openVlastniDrillIn(page);

  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /Přidat/ })).toBeVisible();
});

test('AC1: Přidat button is disabled when text input is empty', async ({ page }) => {
  await openVlastniDrillIn(page);

  await expect(page.getByRole('button', { name: /Přidat/ })).toBeDisabled();
});

test('AC1: previously-typed custom food appears as a chip in the Vlastní drill-in', async ({ page }) => {
  await seedHarvestCandidate(page, 'kokos', 'Kokos');
  await openVlastniDrillIn(page);

  await expect(page.getByRole('button', { name: /^Kokos$/ })).toBeVisible();
});

test('AC1: Vlastní drill-in shows empty-state hint when no harvest candidates exist', async ({ page }) => {
  await openVlastniDrillIn(page);

  await expect(page.getByText(/Zatím žádné vlastní potraviny/)).toBeVisible();
});

// ── AC2: typing + Přidat → editing (Množství visible) ────────────────────────

test('AC2: typing a new food and clicking Přidat puts it in editing (Množství visible)', async ({ page }) => {
  await openVlastniDrillIn(page);

  await page.getByRole('textbox').fill('Špenát');
  await page.getByRole('button', { name: /Přidat/ }).click();

  await expect(page.getByText('Množství')).toBeVisible();
  await expect(page.getByText('Příprava')).toBeVisible();
});

test('AC2: CTA reads "Uložit Špenát" after adding new custom food', async ({ page }) => {
  await openVlastniDrillIn(page);

  await page.getByRole('textbox').fill('Špenát');
  await page.getByRole('button', { name: /Přidat/ }).click();

  await expect(page.getByRole('button', { name: /Uložit Špenát/ })).toBeVisible();
});

test('AC2: text input is cleared after Přidat', async ({ page }) => {
  await openVlastniDrillIn(page);

  await page.getByRole('textbox').fill('Špenát');
  await page.getByRole('button', { name: /Přidat/ }).click();

  await expect(page.getByRole('textbox')).toHaveValue('');
});

test('AC2: confirming the new food via CTA returns to "Uložit Vlastní"', async ({ page }) => {
  await openVlastniDrillIn(page);

  await page.getByRole('textbox').fill('Špenát');
  await page.getByRole('button', { name: /Přidat/ }).click();
  await page.getByRole('button', { name: /Uložit Špenát/ }).click();

  // Food is confirmed; CTA shows "Uložit Vlastní" (nothing editing)
  await expect(page.getByRole('button', { name: /Uložit Vlastní/ })).toBeVisible();
  await expect(page.getByText('Množství')).not.toBeVisible();
});

// ── AC3: tapping existing harvest chip → modal-edit flow ─────────────────────

test('AC3: tapping an existing harvest chip enters editing (Množství visible)', async ({ page }) => {
  await seedHarvestCandidate(page, 'kokos', 'Kokos');
  await openVlastniDrillIn(page);

  await page.getByRole('button', { name: /^Kokos$/ }).click();

  await expect(page.getByText('Množství')).toBeVisible();
  await expect(page.getByRole('button', { name: /Uložit Kokos/ })).toBeVisible();
});

// ── AC4: new food captured to harvest-candidate store ────────────────────────

test('AC4: adding a new custom food captures it to the harvest-candidate store', async ({ page }) => {
  await openVlastniDrillIn(page);

  await page.getByRole('textbox').fill('Špenát');
  await page.getByRole('button', { name: /Přidat/ }).click();

  // Poll the harvest store until the async upsert lands (runs after the editing
  // state is shown) — replaces a fixed 500ms sleep, resolves as soon as it's written.
  const readCandidate = async () =>
    page.evaluate(async () => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      return db.harvest_candidates.get('špenát');
    });
  await expect.poll(async () => (await readCandidate())?.normalizedKey ?? null).toBe('špenát');

  const candidate = await readCandidate();
  expect((candidate as { rawForms: string[] }).rawForms).toContain('Špenát');
});

// ── AC5: standalone custom-food input NOT on grid ────────────────────────────

test('AC5: the grid screen has no standalone custom-food text input', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // The only textbox on the grid should be the meal-notes textarea (id=meal-notes),
  // not a custom-food entry input.
  await expect(page.getByPlaceholder(/Název potraviny/)).not.toBeVisible();
});
