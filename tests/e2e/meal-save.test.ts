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
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  await page.getByRole('button', { name: /Hotovo/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('liveQuery: meal saved on /meal appears on /day/<today> without reload', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await expect(page.getByText('Zatím žádný záznam.')).toBeVisible();

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Hotovo/ }).click();

  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Oběd')).toBeVisible();
  await expect(page.getByText('Brambory')).toBeVisible();
});

// ── Save failure: surfaced, not silently lost ─────────────────────────────────

test('meal save failure: shows an error toast and stays on /meal', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Force the next persistence write to throw, driving DexieMealRepository.save
  // into its catch branch (Result.ok === false). The meal page imports the same
  // db singleton, so patching db.meals.put here affects the real save path.
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    db.meals.put = () => Promise.reject(new Error('QuotaExceededError'));
  });

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Hotovo/ }).click();

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
  });

  await page.goto('/meal?type=breakfast&date=2025-01-15');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);
  await page.getByRole('button', { name: /Hotovo/ }).click();

  await expect(page).toHaveURL('/day/2025-01-15');
  await expect(page.getByText('Brambory')).toBeVisible();
});

// ── Issue #198: date-scoped schedule context ──────────────────────────────────

test('back-dated /meal shows past date\'s elimination set, not today\'s', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: pastDate,
      completedAt: new Date().toISOString(),
      testedAllergens: ['dairy'],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: pastDate,
      estimatedEndDate: future,
      phases: [
        { id: 'elim', type: 'elimination', allergenIds: ['dairy'], startDate: pastDate, endDate: yesterday },
        { id: 'reintro', type: 'reintroduction', allergenIds: ['dairy'], startDate: today, endDate: future },
      ],
    });
  });

  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
  await page.goto(`/meal?type=lunch&date=${pastDate}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  await page.goto(`/meal?type=lunch&date=${today}`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await expect(page.getByText('Dnes vyřazeno:')).not.toBeVisible();
});
