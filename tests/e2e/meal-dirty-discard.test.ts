 
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, startLogging } from './seed';

// Issue #277: dirty-aware discard toast + unified Uložit CTA.
// These complement meal-discard-guard.test.ts (which still covers the
// compose-new + popstate paths) by exercising the new edit-mode behaviors:
// clean back-out, dirty back-out toast wording, delete toast wording, and
// `createdAt` preservation across edit-update.

async function seedLunchWithBrambory(page: Page) {
  // Seed a saved lunch directly into Dexie so we can land on /meal in
  // edit mode without going through the full compose flow.
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:lunch:mother`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: '2025-06-13T08:00:00.000Z',
    });
  }, today);
  return today;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Clean back-out from edit mode: no toast ───────────────────────────────────

test('clean back-out from a saved meal shows no discard toast and preserves the meal', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  // Wait for hydration: the loaded food row appears.
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Untouched back-out.
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  // None of the three toast variants should appear — clean edit is silent.
  await expect(page.getByText('Změny neuloženy')).not.toBeVisible();
  await expect(page.getByText('Jídlo neuloženo')).not.toBeVisible();
  await expect(page.getByText('Jídlo smazáno')).not.toBeVisible();
});

// ── Dirty back-out from edit mode: "Změny neuloženy" + Zpět restores ─────────

test('dirty back-out from a saved meal shows "Změny neuloženy" and Zpět restores the edit', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Dirty: type a note.
  await page.getByRole('textbox', { name: /Poznámka/ }).fill('něco poznámka');

  // Back out — toast must say "Změny neuloženy" (plural feminine), NOT
  // "Jídlo zahozeno" (which would falsely claim the saved meal was lost).
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Změny neuloženy')).toBeVisible();
  await expect(page.getByText('Jídlo zahozeno')).not.toBeVisible();

  // Zpět rehydrates the dirty edit.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByRole('textbox', { name: /Poznámka/ })).toHaveValue('něco poznámka');
});

// ── Delete: "Jídlo smazáno" + Zpět re-saves ──────────────────────────────────

test('explicit Smazat shows "Jídlo smazáno" and Zpět re-persists the meal', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Open the ⋯ overflow, pick "Smazat jídlo", then confirm on the sheet.
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByTestId('overflow-delete').click();
  await page
    .getByRole('dialog', { name: 'Smazat jídlo?' })
    .getByRole('button', { name: 'Smazat jídlo' })
    .click();

  // Lands on /day/<today>; toast reads delete-specific wording.
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo smazáno')).toBeVisible();

  // Zpět rehydrates and the user re-finalizes via "Uložit Oběd" (compose-new
  // path — the original meal is gone from Dexie, so this mints a fresh record).
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();
  // After undo the meal is gone from Dexie, so we are now in compose-new.
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  // The day overview re-shows the meal.
  await expect(page.getByText('Brambory')).toBeVisible();
});

// ── Emptying deletes the meal (issue #588, reverses #586) ────────────────────

test('removing every food and saving deletes the meal and offers undo (#588)', async ({
  page,
}) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Remove the only food. The hint now says saving will delete the meal.
  await page.getByRole('button', { name: /Odebrat Brambory/ }).click();
  await expect(page.getByText(/uložením ho smažeš/)).toBeVisible();

  // Saving the emptied meal deletes it (not a silent no-op restoring the old
  // foods, which was the #586 bug) and surfaces the delete toast.
  await page.getByRole('button', { name: /Uložit změny/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo smazáno')).toBeVisible();
  // The slot no longer shows the food.
  await expect(page.getByText('Brambory')).not.toBeVisible();

  // Undo re-materializes the meal (compose-new path — the row was removed).
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();
});

// ── Past-day delete-undo restores meal on its original day (issue #323) ─────

test('delete-undo on a past day restores the meal to that day, not today', async ({ page }) => {
  // The bug only reproduces on past days; any past day is reachable now that
  // the protocol range is gone (PRD #623, §3a).
  await startLogging(page);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Seed a saved breakfast on yesterday.
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:breakfast:mother`,
      date,
      mealType: 'breakfast',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: '2025-06-13T08:00:00.000Z',
    });
  }, yesterday);

  await page.goto(`/meal?type=breakfast&date=${yesterday}&returnTo=/day/${yesterday}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Delete via the ⋯ overflow, then confirm on the sheet.
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByTestId('overflow-delete').click();
  await page
    .getByRole('dialog', { name: 'Smazat jídlo?' })
    .getByRole('button', { name: 'Smazat jídlo' })
    .click();
  await expect(page).toHaveURL(`/day/${yesterday}`);
  await expect(page.getByText('Jídlo smazáno')).toBeVisible();

  // Undo: must reopen the editor on the *original* day, not on today.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(new RegExp(`/meal\\?.*date=${yesterday}`));
  await expect(page).not.toHaveURL(new RegExp(`date=${today}`));

  // Re-save: the meal must land on yesterday, not today.
  await page.getByRole('button', { name: /Uložit Snídaně/ }).click();
  await expect(page).toHaveURL(`/day/${yesterday}`);

  const persisted = await page.evaluate(async ({ y, t }) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const onYesterday = await db.meals.get(`${y}:breakfast:mother`);
    const onToday = await db.meals.get(`${t}:breakfast:mother`);
    return { onYesterday: !!onYesterday, onToday: !!onToday };
  }, { y: yesterday, t: today });
  expect(persisted.onYesterday).toBe(true);
  expect(persisted.onToday).toBe(false);
});

// ── createdAt preservation on edit-update ────────────────────────────────────

test('save on edit-update preserves the original createdAt and stamps updatedAt', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Dirty: type a note so the CTA enables.
  await page.getByRole('textbox', { name: /Poznámka/ }).fill('edited');

  // Tap "Uložit změny".
  await page.getByRole('button', { name: 'Uložit změny' }).click();
  await expect(page).toHaveURL(`/day/${today}`);

  // Read the persisted meal back.
  const persisted = await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const m = await db.meals.get(`${date}:lunch:mother`);
    return { createdAt: m?.createdAt, updatedAt: m?.updatedAt, notes: m?.notes };
  }, today);

  expect(persisted.createdAt).toBe('2025-06-13T08:00:00.000Z');
  expect(persisted.updatedAt).toBeDefined();
  expect(persisted.updatedAt).not.toBe(persisted.createdAt);
  expect(persisted.notes).toBe('edited');
});

// ── CTA labels: compose-new "Uložit {MealType}" + edit "Uložit změny" disabled

test('finalize CTA labels: "Uložit Oběd" on compose-new, "Uložit změny" (disabled) on clean edit', async ({ page }) => {
  await startLogging(page);
  const today = new Date().toISOString().split('T')[0];

  // Compose-new: empty slot. After adding a food the CTA reads "Uložit Oběd".
  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await expect(page.getByRole('button', { name: /Uložit Oběd/ })).toBeVisible();

  // Persist + reload in edit mode — CTA reads "Uložit změny" and is disabled.
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();
  const cta = page.getByRole('button', { name: 'Uložit změny' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('aria-disabled', 'true');
});
