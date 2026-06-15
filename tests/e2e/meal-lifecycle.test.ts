import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Meal lifecycle E2E (issue #266 / ADR-0018).
 *
 * Replaces the retired `meal-type-pills.test.ts`. Covers the create-flow happy
 * path through the new launcher: open the app FAB → tap "Přidat jídlo" → pick
 * a meal type from the submenu → log a food → "Hotovo" → land back on the day
 * with the meal visible. Re-opening the submenu shows ✓ on the just-logged
 * type.
 */

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

async function completeOnboarding(page: Page, startIso?: string) {
  // Seed the post-onboarding state directly into IndexedDB. Same shortcut as
  // the other meal e2e specs — onboarding itself is covered elsewhere.
  // `startIso` backdates the program so earlier days fall inside the schedule
  // (used by the backfill test); it defaults to today.
  const today = new Date().toISOString().split('T')[0];
  const start = startIso ?? today;
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
  }, start);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('FAB submenu → pick type → add food → Hotovo → meal shows on the day', async ({ page }) => {
  await completeOnboarding(page);

  // Open the global "+" FAB on the bottom nav, then drill into the meal-type
  // submenu via "Přidat jídlo".
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();

  // Submenu shows the four meal types.
  await expect(page.getByTestId('fab-meal-type-breakfast')).toBeVisible();
  await expect(page.getByTestId('fab-meal-type-lunch')).toBeVisible();
  await expect(page.getByTestId('fab-meal-type-snack')).toBeVisible();
  await expect(page.getByTestId('fab-meal-type-dinner')).toBeVisible();

  // No meal logged yet — none of the rows carry the ✓ marker.
  await expect(page.getByTestId('fab-meal-type-lunch')).toHaveAttribute('data-logged', 'false');

  // Pick lunch — lands on /meal with the type bound to the URL.
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  // The fixed-type page renders the heading and family grid (no pill row).
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await expect(page.getByText('Všechny kategorie')).toBeVisible();

  // Drill into Mléko → tap Kravské mléko → save the food → save the family.
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();

  // Hotovo persists the meal and returns to the day overview.
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();
  const today = new Date().toISOString().split('T')[0];
  await page.waitForURL(`**/day/${today}`);

  // The day's meal card now shows lunch + the food we logged.
  await expect(page.getByText('Oběd')).toBeVisible();
  await expect(page.getByText('Kravské mléko')).toBeVisible();

  // Re-open the FAB submenu — the lunch slot is now marked ✓.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await expect(page.getByTestId('fab-meal-type-lunch')).toHaveAttribute('data-logged', 'true');
  await expect(page.getByTestId('fab-meal-type-breakfast')).toHaveAttribute('data-logged', 'false');
});

test('tap a logged meal row → edit → Hotovo → change reflects on the day (#267)', async ({ page }) => {
  await completeOnboarding(page);

  // Seed a lunch with one food via the FAB launcher (the only legal entry path).
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  const today = new Date().toISOString().split('T')[0];
  await page.waitForURL(`**/day/${today}`);

  // The lunch row is on screen. Tap it directly — this is the new gesture #267 adds.
  const lunchRow = page.getByTestId('meal-row-lunch');
  await expect(lunchRow).toBeVisible();
  await expect(lunchRow).toContainText('Kravské mléko');
  await lunchRow.click();

  // Lands on the same /meal URL the FAB ✓ entry would have produced.
  await page.waitForURL(/\/meal\?type=lunch/);
  expect(page.url()).toContain(`date=${today}`);
  expect(page.url()).toContain(`returnTo=/day/${today}`);

  // Edit-load path: the previously-saved food is hydrated and visible on the working list.
  await expect(page.getByText('Kravské mléko')).toBeVisible();

  // Add a second food (Mrkev, under Zelenina) and persist via the
  // edit-mode finalize CTA (renamed from "Hotovo" in issue #277).
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Mrkev', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Mrkev/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  await page.getByRole('button', { name: 'Uložit změny' }).click();

  // Back on the day: the lunch row now carries both foods.
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Kravské mléko');
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Mrkev');
});

test('delete a meal → row disappears → undo restores it (#268)', async ({ page }) => {
  await completeOnboarding(page);

  // Seed a lunch with one food via the FAB launcher.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);

  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  const today = new Date().toISOString().split('T')[0];
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Kravské mléko');

  // Tap the lunch row → land on /meal in edit mode.
  await page.getByTestId('meal-row-lunch').click();
  await page.waitForURL(/\/meal\?type=lunch/);
  await expect(page.getByText('Kravské mléko')).toBeVisible();

  // Open the ⋯ overflow and confirm "Smazat jídlo".
  await page.getByRole('button', { name: 'Více' }).click();
  await page.getByRole('button', { name: 'Smazat jídlo' }).click();

  // Lands on the day; the lunch row is gone.
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toHaveCount(0);

  // The discard toast is offering undo. Tap "Zpět" → land back on /meal with
  // the original food rehydrated; tap Hotovo to re-persist the meal.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await page.waitForURL(/\/meal\?.*type=lunch/);
  await expect(page.getByText('Kravské mléko')).toBeVisible();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  // Back on the day, the lunch row is restored with its original food.
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Kravské mléko');
});

test('backfill a past day via the day-scoped FAB persists on that date, not today (#265 story 19)', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // Backdate the program so `yesterday` falls inside the schedule window.
  await completeOnboarding(page, weekAgo);

  // View an earlier day. The FAB is bound to the day page's `selectedDate`,
  // so opening it here should log against `yesterday`, not today.
  await page.goto(`/day/${yesterday}`);
  await page.waitForURL(`**/day/${yesterday}`);

  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByTestId('fab-action-meal').click();
  await page.getByTestId('fab-meal-type-lunch').click();

  // The launcher carries the viewed day through to /meal — not today.
  await page.waitForURL(/\/meal\?type=lunch/);
  expect(page.url()).toContain(`date=${yesterday}`);
  expect(page.url()).toContain(`returnTo=/day/${yesterday}`);

  // Log a food and finalize.
  await page.getByRole('button', { name: /Mléko/ }).click();
  await page.getByRole('button', { name: 'Kravské mléko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Kravské mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Mléko/ }).click();
  await page.getByRole('button', { name: /Uložit Oběd/ }).click();

  // Returns to yesterday's day page with the meal visible there.
  await page.waitForURL(`**/day/${yesterday}`);
  await expect(page.getByTestId('meal-row-lunch')).toContainText('Kravské mléko');

  // The meal landed on yesterday only — today's lunch slot stays empty.
  await page.goto(`/day/${today}`);
  await page.waitForURL(`**/day/${today}`);
  await expect(page.getByTestId('meal-row-lunch')).toHaveCount(0);
});
