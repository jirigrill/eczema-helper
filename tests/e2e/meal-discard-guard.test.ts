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

async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'load' });
});

// ── Discard guard: empty working list ─────────────────────────────────────────

test('discard guard: back with empty working list navigates immediately, no toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo zahozeno')).not.toBeVisible();
});

// ── Discard guard: non-empty working list ─────────────────────────────────────

test('discard guard: back with non-empty working list discards and shows toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Back arrow — should discard and navigate to /day/<today>
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  // Toast must appear on the destination screen (rendered by layout)
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();
});

// ── Discard undo: Zpět restores working list ──────────────────────────────────

test('discard guard: tapping Zpět on toast restores the working list', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Back — discard
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();

  // Tap "Zpět" on the toast
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);

  // The restored working list should contain the original food
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});
