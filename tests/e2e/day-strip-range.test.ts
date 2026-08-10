import { expect, test } from '@playwright/test';

import { clearDb, isoDaysFromToday, seedFeedingStage, seedMeal } from './seed';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── US-1: fresh install spans past + future ──────────────────────────────────

test('fresh install shows future cells — today + 7d is reachable', async ({ page }) => {
  const today = await seedFeedingStage(page);
  const plus7 = isoDaysFromToday(7);
  const minus7 = isoDaysFromToday(-7);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const cells = page.getByTestId('day-strip-cell');
  // 15-cell window: today ± 7d.
  await expect.poll(async () => cells.count()).toBe(15);
  await expect(page.locator(`[data-testid="day-strip-cell"][data-date="${plus7}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="day-strip-cell"][data-date="${minus7}"]`)).toBeVisible();
});

// ── US-10: a future cell is loggable ─────────────────────────────────────────

test('tapping a future cell navigates to that day and allows logging a meal', async ({ page }) => {
  const today = await seedFeedingStage(page);
  const future = isoDaysFromToday(3);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const futureCell = page.locator(`[data-testid="day-strip-cell"][data-date="${future}"]`);
  await expect(futureCell).toBeVisible();
  await futureCell.click();
  await expect(page).toHaveURL(`/day/${future}`);
  // A future day is a normal loggable day — the meal card is present, not a
  // read-only preview.
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
  await expect(page.getByTestId('meal-row-lunch')).toBeVisible();
});

// ── US-6: logging an earlier day grows the left edge live ────────────────────

test('logging a day earlier than any entry extends the left edge without reload', async ({
  page,
}) => {
  const today = await seedFeedingStage(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const earlier = isoDaysFromToday(-20); // well outside the ±7d floor
  await seedMeal(page, earlier);

  const earlierCell = page.locator(`[data-testid="day-strip-cell"][data-date="${earlier}"]`);
  // liveQuery drives the growth — poll until the new left-edge cell appears.
  await expect(earlierCell).toBeVisible();
});

// ── US-9: scroll left reaches the earliest cell; no jump-to-start button ─────

test('scrolling left reaches the earliest cell; no jump-to-start control exists', async ({
  page,
}) => {
  const today = await seedFeedingStage(page);
  const earliest = isoDaysFromToday(-20);
  await seedMeal(page, earliest);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const firstCell = page.getByTestId('day-strip-cell').nth(0);
  await expect.poll(async () => firstCell.getAttribute('data-date')).toBe(earliest);

  // No jump-to-start affordance was added — only the existing back-to-today chip
  // (which appears off today) may exist, never a "jump to beginning" control.
  await expect(page.getByTestId('day-strip-jump-to-start')).toHaveCount(0);

  // The earliest cell is reachable and selects its own date.
  await firstCell.scrollIntoViewIfNeeded();
  await firstCell.click();
  await expect(page).toHaveURL(`/day/${earliest}`);
});

// ── EC-2: direct nav past the future edge renders that day ───────────────────

test('direct navigation to a URL past the future edge renders that day', async ({ page }) => {
  await seedFeedingStage(page);
  const farFuture = isoDaysFromToday(40); // beyond the today + 7d floor
  await page.goto(`/day/${farFuture}`);
  await expect(page).toHaveURL(`/day/${farFuture}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // The range clamps outward — the out-of-span day has its own selected cell.
  const selected = page.locator(`[data-testid="day-strip-cell"][data-date="${farFuture}"]`);
  await expect(selected).toHaveAttribute('aria-current', 'date');
});
