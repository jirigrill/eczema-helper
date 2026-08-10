import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, seedFeedingStage } from './seed';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Seed a single meal so the day strip's earliest-logged floor reaches `date`. */
async function seedMeal(page: Page, date: string) {
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:lunch:mother`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: `${date}T12:00:00.000Z`,
    });
  }, date);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Redirect tests ────────────────────────────────────────────────────────

test('/day/<invalid> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto('/day/not-a-date');
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<future> renders that day (future days are loggable, #654)', async ({ page }) => {
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${futureDate}`);
  // The day strip now spans past and future edges — a future day is a normal,
  // fully-loggable day and renders its own view rather than redirecting.
  await expect(page).toHaveURL(`/day/${futureDate}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

test('/day/<before-start> renders that day (the strip may not reach it)', async ({ page }) => {
  // With the protocol range gone, any valid past date renders its own day —
  // a directly-navigated out-of-range day is no longer redirected (PRD #623, §3a).
  const beforeStart = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${beforeStart}`);
  await expect(page).toHaveURL(`/day/${beforeStart}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

// ── Past-day rendering ────────────────────────────────────────────────────

test('/day/<past> renders day view with day strip', async ({ page }) => {
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // Record cards are present for past dates
  await expect(page.getByText('Stav ekzému')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

test('/day/<past> does not show a Dnes pill (pill removed)', async ({ page }) => {
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

// ── Today-only chrome gating ──────────────────────────────────────────────

test('/day/<today> shows the Dnes heading, no Dnes pill', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Dnes', exact: true })).toBeVisible();
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

test('/day/<past> shows the date as the heading, not Dnes', async ({ page }) => {
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByRole('heading', { name: 'Dnes', exact: true })).toHaveCount(0);
});

// ── The today marker is visual only ───────────────────────────────────────

test("today's ring marks today and says nothing about what is logged", async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await seedMeal(page, today);
  await seedMeal(page, pastDate);
  await page.goto(`/day/${pastDate}`);
  // Today is in the strip but not selected: it gets the ring, and the ring
  // carries no record state (the recorded-dot signal is parked).
  const ring = page.getByTestId('day-strip-today-ring');
  await expect(ring).toBeVisible();
  await expect(ring).not.toHaveAttribute('data-recorded', /.*/);
});

// ── DayStrip navigation ──────────────────────────────────────────────────

test('clicking a strip cell navigates to /day/<cell-date>', async ({ page }) => {
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  // The strip spans earliest-logged … today; with nothing logged it reaches
  // back only as far as the directly-navigated day. Land on a past day so the
  // strip has cells other than today to tap.
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const cells = page.getByTestId('day-strip-cell');
  await expect.poll(async () => cells.count()).toBeGreaterThan(1);
  const total = await cells.count();
  let target = '';
  for (let i = 0; i < total; i++) {
    const cell = cells.nth(i);
    const date = await cell.getAttribute('data-date');
    if (date && date !== pastDate) {
      target = date;
      await cell.click();
      break;
    }
  }
  expect(target).not.toBe('');
  await expect(page).toHaveURL(`/day/${target}`);
});

test('the "↩ Dnes" header chip navigates back to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${pastDate}`);
  // The bottom nav is gone (PRD #623, §3); the header chip is the jump-to-today
  // affordance and appears only off today.
  await page.getByTestId('back-to-today-chip').click();
  await expect(page).toHaveURL(`/day/${today}`);
});

// ── No-program state ──────────────────────────────────────────────────────

test('/day/<date> redirects to onboarding when DB is empty', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  // DB already cleared by beforeEach
  await page.goto(`/day/${today}`);
  // Layout redirects to / (onboarding) when schedule DB is empty
  await expect(page).toHaveURL('/');
});

// ── No protocol surfaces on the day view ──────────────────────────────────

test('/day/<today> shows no "Smím / Vyhýbej se" card', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // The protocol surfaces are gone from the day view (PRD #623, step 6).
  await expect(page.getByText('✗ Vyhýbej se')).toHaveCount(0);
  await expect(page.getByText('✓ Smím')).toHaveCount(0);
  await expect(page.getByText('🥛 Mléčné výrobky')).toHaveCount(0);
});

// ── Decoupled scroll-then-tap: scrolling only browses ─────────────────────

test('scrolling the strip only browses — URL and content stay until a tap', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  // Log a past meal so the strip spans that day … today even while on today.
  await seedMeal(page, pastDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // Today content is on screen (the "Dnes" heading only renders for today).
  await expect(page.getByRole('heading', { name: 'Dnes', exact: true })).toBeVisible();
  // The strip has grown past today (its earliest cell reaches the logged day).
  await expect.poll(async () => page.getByTestId('day-strip-cell').count()).toBeGreaterThan(1);

  const scroller = page.getByTestId('day-strip-scroller');
  // Scroll backwards through past days, then forward into future days.
  await scroller.evaluate((el) => {
    el.scrollLeft = 0;
  });
  await scroller.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });

  // Decoupled model: passing over days changes nothing — still on today,
  // today's content still shown, no flash of another day's view.
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Dnes', exact: true })).toBeVisible();

  // A deliberate tap is what commits selection and navigates.
  const cells = page.getByTestId('day-strip-cell');
  const total = await cells.count();
  let target = '';
  for (let i = 0; i < total; i++) {
    const cell = cells.nth(i);
    const date = await cell.getAttribute('data-date');
    if (date && date !== today) {
      target = date;
      await cell.click();
      break;
    }
  }
  expect(target).not.toBe('');
  await expect(page).toHaveURL(`/day/${target}`);
});

// ── Browser back preserves navigation ─────────────────────────────────────

test('browser back returns to the previous day after a strip tap', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  // Log a past meal so the strip spans that day … today.
  await seedMeal(page, pastDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  // Tap a non-today cell → navigates to that day.
  const cells = page.getByTestId('day-strip-cell');
  await expect.poll(async () => cells.count()).toBeGreaterThan(1);
  const total = await cells.count();
  let target = '';
  for (let i = 0; i < total; i++) {
    const cell = cells.nth(i);
    const date = await cell.getAttribute('data-date');
    if (date && date !== today) {
      target = date;
      await cell.click();
      break;
    }
  }
  expect(target).not.toBe('');
  await expect(page).toHaveURL(`/day/${target}`);

  // Browser back returns to today, content intact.
  await page.goBack();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Dnes', exact: true })).toBeVisible();
});

// ── The earliest cell selects its own date, no jump-to-today ───────────────

test('clicking the earliest logged cell selects that date (no jump-to-today)', async ({ page }) => {
  // The strip spans min(today − 7d, earliest-logged) … today. A meal logged
  // well outside the ±7d floor is the strip's earliest cell — clicking it must
  // navigate to that day.
  const earliest = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0]!;
  await seedFeedingStage(page);
  await seedMeal(page, earliest);

  await page.goto(`/day/${earliest}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const firstCell = page.getByTestId('day-strip-cell').nth(0);
  // The earliest-logged store resolves via liveQuery; poll until the strip's
  // earliest cell reflects the logged day.
  await expect.poll(async () => firstCell.getAttribute('data-date')).toBe(earliest);
  await firstCell.click();
  await expect(page).toHaveURL(`/day/${earliest}`);
});
