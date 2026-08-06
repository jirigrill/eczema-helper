import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Copy-to-another-day, first-run state (PRD #623, issue #631, §3e).
 *
 * The copy-destination picker used to gate every cell behind `isCopyDestLoggable`,
 * whose first condition (`raw.status === 'ready'`) only held when a generated
 * schedule row existed in Dexie. After #630 replaced the five-step onboarding
 * with the one-screen feeding-stage picker, nothing writes that row — so for
 * every real first-run user the gate was permanently `false` and the whole copy
 * feature silently stopped responding.
 *
 * This spec reproduces that exact first-run state: it seeds ONLY the feeding
 * stage (no `schedule`, no `answers`), then copies a meal to a different DAY and
 * to a different MEAL TYPE, asserting both land. §3e's deletion of the gate is
 * what makes it pass — the old code's picker never opened.
 */

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.settings.clear();
    await db.meals.clear();
    db.close();
  });
}

/** Seed the true first-run state after #630: a feeding stage and nothing else. */
async function seedFeedingStageOnly(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('copies a meal to a different day and a different meal type with only a feeding stage seeded', async ({
  page,
}) => {
  const today = new Date().toISOString().split('T')[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;

  await seedFeedingStageOnly(page);

  // Log a lunch meal on YESTERDAY via the day-scoped FAB. Logging on a past day
  // moves the earliest-logged floor back to yesterday, so the copy strip spans
  // yesterday…today and today becomes a reachable, different destination.
  await page.goto(`/day/${yesterday}`);
  await page.waitForURL(/\/day\//);
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  await page.waitForURL(`**/day/${yesterday}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Brambory');

  // Re-open yesterday's lunch to reach the ⋯ overflow (copy affordance).
  await page.getByTestId('meal-row-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  // ── Copy 1: to a DIFFERENT DAY (today), same meal type ──
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByRole('button', { name: 'Kopírovat jídlo' }).click();
  // Every rendered cell is a legal destination (§3e): pick today's cell.
  await page.locator(`[data-testid="day-strip-cell"][data-date="${today}"]`).click();
  // The "Kopírovat sem" button is always enabled now.
  const copyHere = page.getByRole('button', { name: 'Kopírovat sem' });
  await expect(copyHere).toBeEnabled();
  await copyHere.click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Brambory');

  // ── Copy 2: to a DIFFERENT MEAL TYPE (dinner) ──
  await page.getByTestId('meal-row-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByRole('button', { name: 'Kopírovat jídlo' }).click();
  // Destination day defaults to the source day (today); copy into dinner.
  await page.getByRole('button', { name: 'Kopírovat sem' }).click();
  await page.getByTestId('fab-meal-type-dinner').click();
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-dinner')).toContainText('Brambory');
});
