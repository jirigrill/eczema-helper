import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────

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

/** Seed a schedule where startDate is `startDate` and today is in an elimination phase.
 *  Returns the seeded startDate. */
async function seedSchedule(page: Page, startDate: string) {
  await page.evaluate(async (start) => {
    const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const endReset = new Date(new Date(start).getTime() + 4 * 86400000).toISOString().split('T')[0];
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
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: future,
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: start, endDate: endReset },
        { id: 'elim', type: 'elimination', allergenIds: ['dairy'], startDate: today, endDate: future },
      ],
    });
  }, startDate);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ── Redirect tests ────────────────────────────────────────────────────────

test('/day/<invalid> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto('/day/not-a-date');
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<future> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${futureDate}`);
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<before-start> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const beforeStart = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${beforeStart}`);
  await expect(page).toHaveURL(`/day/${today}`);
});

// ── Past-day rendering ────────────────────────────────────────────────────

test('/day/<past> renders day view with week strip', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('week-strip')).toBeVisible();
  // Record cards are present for past dates
  await expect(page.getByText('Stav ekzému')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

test('/day/<past> shows Dnes pill', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('dnes-pill')).toBeVisible();
});

// ── Today-only chrome gating ──────────────────────────────────────────────

test('/day/<today> shows task counter, no Dnes pill', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('task-counter')).toBeVisible();
  await expect(page.getByTestId('dnes-pill')).not.toBeVisible();
});

test('/day/<past> hides task counter', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('task-counter')).not.toBeVisible();
});

// ── WeekStrip navigation ──────────────────────────────────────────────────

test('clicking a strip cell navigates to /day/<cell-date>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('week-strip')).toBeVisible();

  // Find a non-selected cell that is not before protocol start.
  const cells = page.getByTestId('week-strip-cell');
  // The first in-range, non-selected cell (any cell before today in the strip).
  const firstCell = cells.nth(0);
  const cellDate = await firstCell.getAttribute('data-date');
  await firstCell.click();
  await expect(page).toHaveURL(`/day/${cellDate}`);
});

test('clicking Dnes pill navigates back to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('dnes-pill')).toBeVisible();
  await page.getByTestId('dnes-pill').click();
  await expect(page).toHaveURL(`/day/${today}`);
});

// ── No-program state ──────────────────────────────────────────────────────

test('/day/<date> shows no-program message when DB is empty', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  // DB already cleared by beforeEach
  await page.goto(`/day/${today}`);
  await expect(page.getByText('Program není nastaven. Dokončete dotazník.')).toBeVisible();
});
