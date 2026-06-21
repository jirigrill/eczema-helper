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
});

// ── Redirect tests ────────────────────────────────────────────────────────

test('/day/<invalid> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto('/day/not-a-date');
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<future> renders read-only "Naplánováno" preview, no FAB', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${futureDate}`);
  // Stays on the future URL — no redirect.
  await expect(page).toHaveURL(`/day/${futureDate}`);
  // Preview block visible.
  await expect(page.getByTestId('day-preview')).toBeVisible();
  await expect(page.getByText('Naplánováno')).toBeVisible();
  // Logging entry points are absent.
  await expect(page.getByText('Stav ekzému')).not.toBeVisible();
  await expect(page.getByText('Foto kůže')).not.toBeVisible();
  await expect(page.getByText('Dnešní jídla')).not.toBeVisible();
  // FAB (add-record button) is suppressed on a future day.
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toHaveCount(0);
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

test('/day/<past> renders day view with day strip', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // Record cards are present for past dates
  await expect(page.getByText('Stav ekzému')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

test('/day/<past> does not show a Dnes pill (pill removed)', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

// ── Today-only chrome gating ──────────────────────────────────────────────

test('/day/<today> shows task counter, no Dnes pill', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('task-counter')).toBeVisible();
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

test('/day/<past> hides task counter', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('task-counter')).not.toBeVisible();
});

// ── DayStrip navigation ──────────────────────────────────────────────────

test('clicking a strip cell navigates to /day/<cell-date>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  // Pick the first in-range, non-selected cell (skip before-start dates which
  // resolveRouteDate redirects to today).
  const cells = page.getByTestId('day-strip-cell');
  const total = await cells.count();
  let target = '';
  for (let i = 0; i < total; i++) {
    const cell = cells.nth(i);
    const date = await cell.getAttribute('data-date');
    const isBeforeStart = await cell.getAttribute('data-before-start');
    if (date && !isBeforeStart && date !== today) {
      target = date;
      await cell.click();
      break;
    }
  }
  expect(target).not.toBe('');
  await expect(page).toHaveURL(`/day/${target}`);
});

test('returning via the bottom-nav Dnes tab navigates to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  // Bottom-nav "Dnes" tab is an <a> with text "Dnes"
  await page.getByRole('link', { name: 'Dnes' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

// ── No-program state ──────────────────────────────────────────────────────

test('/day/<date> redirects to onboarding when DB is empty', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  // DB already cleared by beforeEach
  await page.goto(`/day/${today}`);
  // Layout redirects to / (onboarding) when schedule DB is empty
  await expect(page).toHaveURL('/');
});

// ── Allergen columns reflect the phase active on the selected date ─────────

test('/day/<past-reset> shows "Žádná omezení" — dairy not yet eliminated', async ({ page }) => {
  // seedSchedule puts dairy elimination starting today; the reset phase covers
  // startDate through startDate+4. A date 2 days after start is in reset → no eliminations.
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const resetDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${resetDate}`);
  await expect(page.getByText('✗ Vyhýbej se')).toBeVisible();
  await expect(page.getByText('Žádná omezení')).toBeVisible();
});

test('/day/<today> shows dairy in "Vyhýbej se" column', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByText('✗ Vyhýbej se')).toBeVisible();
  // AllergenChip renders the dairy category name with emoji
  await expect(page.getByText('🥛 Mléčné výrobky')).toBeVisible();
});

// ── Before-start cells remain selectable, no page-back behavior ────────────

test('clicking a before-start cell selects that date (no jump-to-today)', async ({ page }) => {
  // Protocol starts 7 days ago; the strip extends a buffer before that. The
  // earliest cell is before-start — clicking it must navigate to that date,
  // not redirect to today.
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  await seedSchedule(page, startDate);

  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const firstCell = page.getByTestId('day-strip-cell').nth(0);
  const cellDate = await firstCell.getAttribute('data-date');
  // The earliest cell should sit before the seeded protocol startDate.
  expect(cellDate && cellDate < startDate).toBe(true);
  await firstCell.click();
  // The page redirects before-start dates to today (resolveRouteDate guard);
  // tapping the cell still issues navigation rather than the old "jump to today"
  // intercept that ignored the click.
  await expect(page).toHaveURL(`/day/${today}`);
});
