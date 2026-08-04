import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.settings.clear();
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
      feedingStage: 'breastfed',
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
    // The app derives feedingStage from the live settings master switch (#567);
    // seed it so a directly-seeded schedule renders without going through onboarding.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  }, today);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

/** Confirm one food (Brambory from Zelenina) and commit the family. */
async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  // Per-test isolation gives a fresh context with an empty IndexedDB, so the
  // extra reload to "reset" state is redundant — goto + clear is enough.
  await page.goto('/');
  await clearDb(page);
});

// ── Core save flow ────────────────────────────────────────────────────────────

test('meal save: add a food via drill-in, hit Hotovo, navigates to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);

  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('liveQuery: meal saved on /meal appears on /day/<today> without reload', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Lunch slot starts empty — no foods rendered in its row.
  const lunchRow = page.getByTestId('meal-row-lunch');
  await expect(lunchRow).toBeVisible();
  await expect(lunchRow).not.toContainText('Brambory');

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Brambory');
});

// ── Save failure: surfaced, not silently lost ─────────────────────────────────

test('meal save failure: shows an error toast and stays on /meal', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // Force the next persistence write to throw, driving DexieMealRepository.save
  // into its catch branch (Result.ok === false). The meal page imports the same
  // db singleton, so patching db.meals.put here affects the real save path.
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    db.meals.put = () => Promise.reject(new Error('QuotaExceededError'));
  });

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  // Error surfaced and the user is NOT navigated away — the working meal survives.
  await expect(page.getByRole('alert')).toContainText('QuotaExceededError');
  await expect(page).toHaveURL(/\/meal/);
});

// ── Slice 4c: ?date= query parameter ─────────────────────────────────────────

test('?date= param: saves to specified date, navigates to /day/<date>', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: '2025-01-01',
      completedAt: '2025-01-01T00:00:00.000Z',
      testedAllergens: [],
      feedingStage: 'breastfed',
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: '2025-01-01',
      estimatedEndDate: '2027-01-01',
      phases: [{
        id: 'elim',
        type: 'elimination',
        allergenIds: [],
        startDate: '2025-01-01',
        endDate: '2027-01-01',
      }],
    });
    // The app derives feedingStage from the live settings master switch (#567);
    // seed it so a directly-seeded schedule renders without going through onboarding.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  });

  await page.goto('/meal?type=breakfast&date=2025-01-15');
  await expect(page.getByRole('heading', { name: 'Snídaně' })).toBeVisible();

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Uložit Snídaně/ }).click();

  await expect(page).toHaveURL('/day/2025-01-15');
  await expect(page.getByText('Brambory')).toBeVisible();
});
