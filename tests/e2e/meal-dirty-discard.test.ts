/* eslint-disable */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Issue #277: dirty-aware discard toast + unified Uložit CTA.
// These complement meal-discard-guard.test.ts (which still covers the
// compose-new + popstate paths) by exercising the new edit-mode behaviors:
// clean back-out, dirty back-out toast wording, delete toast wording, and
// `createdAt` preservation across edit-update.

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.meals.clear();
    db.close();
  });
}

async function completeOnboarding(page: Page) {
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

async function seedLunchWithBrambory(page: Page) {
  // Seed a saved lunch directly into Dexie so we can land on /meal in
  // edit mode without going through the full compose flow.
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:lunch`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'portion' }],
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
  await completeOnboarding(page);
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
  await completeOnboarding(page);
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
  await completeOnboarding(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Open the ⋯ overflow + confirm Smazat.
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByRole('button', { name: 'Smazat jídlo' }).click();

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

// ── Past-day delete-undo restores meal on its original day (issue #323) ─────

test('delete-undo on a past day restores the meal to that day, not today', async ({ page }) => {
  // Onboarding seeds programStartDate=today, but the bug only reproduces on
  // past days — re-seed with programStartDate 5 days back so yesterday lands
  // inside the schedule and `/day/<yesterday>` doesn't redirect to today.
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const start = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
  const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
  await page.evaluate(async ({ start, future }) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.update('singleton', { programStartDate: start });
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
  }, { start, future });

  // Seed a saved breakfast on yesterday.
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:breakfast`,
      date,
      mealType: 'breakfast',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'portion' }],
      createdAt: '2025-06-13T08:00:00.000Z',
    });
  }, yesterday);

  await page.goto(`/meal?type=breakfast&date=${yesterday}&returnTo=/day/${yesterday}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  // Delete via the ⋯ overflow.
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByRole('button', { name: 'Smazat jídlo' }).click();
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
    const onYesterday = await db.meals.get(`${y}:breakfast`);
    const onToday = await db.meals.get(`${t}:breakfast`);
    return { onYesterday: !!onYesterday, onToday: !!onToday };
  }, { y: yesterday, t: today });
  expect(persisted.onYesterday).toBe(true);
  expect(persisted.onToday).toBe(false);
});

// ── createdAt preservation on edit-update ────────────────────────────────────

test('save on edit-update preserves the original createdAt and stamps updatedAt', async ({ page }) => {
  await completeOnboarding(page);
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
    const m = await db.meals.get(`${date}:lunch`);
    return { createdAt: m?.createdAt, updatedAt: m?.updatedAt, notes: m?.notes };
  }, today);

  expect(persisted.createdAt).toBe('2025-06-13T08:00:00.000Z');
  expect(persisted.updatedAt).toBeDefined();
  expect(persisted.updatedAt).not.toBe(persisted.createdAt);
  expect(persisted.notes).toBe('edited');
});

// ── CTA labels: compose-new "Uložit {MealType}" + edit "Uložit změny" disabled

test('finalize CTA labels: "Uložit Oběd" on compose-new, "Uložit změny" (disabled) on clean edit', async ({ page }) => {
  await completeOnboarding(page);
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
