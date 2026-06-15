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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.harvest_candidates.clear();
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
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await page.getByRole('button', { name: /Vlastní/ }).click();
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await completeOnboarding(page);
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
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // The only textbox on the grid should be the meal-notes textarea (id=meal-notes),
  // not a custom-food entry input.
  await expect(page.getByPlaceholder(/Název potraviny/)).not.toBeVisible();
});
