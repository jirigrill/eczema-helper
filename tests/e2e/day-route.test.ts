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
    await db.settings.clear();
    await db.meals.clear();
    await db.skin_observations.clear();
    db.close();
  });
}

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

/** Seed a schedule where startDate is `startDate` and today is in an elimination phase.
 *  Returns the seeded startDate. */
async function seedSchedule(page: Page, startDate: string) {
  await page.evaluate(async (start) => {
    const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]!;
    const today = new Date().toISOString().split('T')[0]!;
    const endReset = new Date(new Date(start).getTime() + 4 * 86400000).toISOString().split('T')[0]!;
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
      feedingStage: 'breastfed',
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
    // The app derives feedingStage from the live settings master switch (#567);
    // seed it so a directly-seeded schedule renders without going through onboarding.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  }, startDate);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Redirect tests ────────────────────────────────────────────────────────

test('/day/<invalid> redirects to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto('/day/not-a-date');
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<future> redirects to /day/<today> (no future logging)', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${futureDate}`);
  // The day view is a record of what happened — a future day redirects home.
  await expect(page).toHaveURL(`/day/${today}`);
});

test('/day/<before-start> renders that day (the strip may not reach it)', async ({ page }) => {
  // With the protocol range gone, any valid past date renders its own day —
  // a directly-navigated out-of-range day is no longer redirected (PRD #623, §3a).
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const beforeStart = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${beforeStart}`);
  await expect(page).toHaveURL(`/day/${beforeStart}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

// ── Past-day rendering ────────────────────────────────────────────────────

test('/day/<past> renders day view with day strip', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // Record cards are present for past dates
  await expect(page.getByText('Stav ekzému')).toBeVisible();
  await expect(page.getByText('Dnešní jídla')).toBeVisible();
});

test('/day/<past> does not show a Dnes pill (pill removed)', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

// ── Today-only chrome gating ──────────────────────────────────────────────

test('/day/<today> shows task counter, no Dnes pill', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('task-counter')).toBeVisible();
  await expect(page.getByTestId('dnes-pill')).toHaveCount(0);
});

test('/day/<past> hides task counter', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  await expect(page.getByTestId('task-counter')).not.toBeVisible();
});

// ── DayStrip navigation ──────────────────────────────────────────────────

test('clicking a strip cell navigates to /day/<cell-date>', async ({ page }) => {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
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

test('returning via the bottom-nav Dnes tab navigates to /day/<today>', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0]!;
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await page.goto(`/day/${pastDate}`);
  // Bottom-nav "Dnes" tab is an <a> with text "Dnes"
  await page.getByRole('link', { name: 'Dnes' }).click();
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
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
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
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  // Log a past meal so the strip spans that day … today even while on today.
  await seedMeal(page, pastDate);
  await page.goto(`/day/${today}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();
  // Today content is on screen (task counter only renders for today).
  await expect(page.getByTestId('task-counter')).toBeVisible();
  // The strip has grown past today (its earliest cell reaches the logged day).
  await expect
    .poll(async () => page.getByTestId('day-strip-cell').count())
    .toBeGreaterThan(1);

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
  await expect(page.getByTestId('task-counter')).toBeVisible();

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
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
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
  await expect(page.getByTestId('task-counter')).toBeVisible();
});

// ── The earliest cell selects its own date, no jump-to-today ───────────────

test('clicking the earliest logged cell selects that date (no jump-to-today)', async ({ page }) => {
  // The strip spans earliest-logged … today. A meal logged five days ago is the
  // strip's earliest cell — clicking it must navigate to that day.
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
  const earliest = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!;
  await seedSchedule(page, startDate);
  await seedMeal(page, earliest);

  await page.goto(`/day/${earliest}`);
  await expect(page.getByTestId('day-strip')).toBeVisible();

  const firstCell = page.getByTestId('day-strip-cell').nth(0);
  // The earliest-logged store resolves via liveQuery; poll until the strip's
  // earliest cell reflects the logged day.
  await expect
    .poll(async () => firstCell.getAttribute('data-date'))
    .toBe(earliest);
  await firstCell.click();
  await expect(page).toHaveURL(`/day/${earliest}`);
});
