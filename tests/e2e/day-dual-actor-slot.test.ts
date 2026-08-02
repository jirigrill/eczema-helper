import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Day-view dual-actor slot layout (issue #570), end to end. In `mixed` a meal
// slot renders the mother's and the child's meal as stacked per-actor rows under
// a shared header, and shows a "+" on an empty actor's row vs. a "›" on a logged
// one. In single-actor stages (`breastfed`/`solids`) the slot collapses to
// today's single-row card with no actor sub-rows. Seeds post-onboarding state
// directly via Dexie.

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

/** Seed post-onboarding state directly with the given feeding stage and a
 *  today-rooted schedule. The day view no longer reads the schedule, but the
 *  seeded settings row gates the layout redirect. Returns today's ISO date. */
async function seedStage(page: Page, stage: 'breastfed' | 'mixed' | 'solids'): Promise<string> {
  const today = new Date().toISOString().split('T')[0]!;
  await page.evaluate(
    async ({ start, feedingStage }) => {
      const future = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]!;
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
        feedingStage,
      });
      await db.schedule.put({
        id: 'singleton',
        permanentMother: [],
        permanentBaby: [],
        startDate: start,
        estimatedEndDate: future,
        phases: [
          {
            id: 'elim',
            type: 'elimination',
            allergenIds: ['dairy'],
            startDate: start,
            endDate: future,
          },
        ],
      });
      // feedingStage is derived from the live settings master switch (#567).
      await db.settings.put({ id: 'singleton', feedingStage });
    },
    { start: today, feedingStage: stage },
  );
  return today;
}

/** Log a meal for one actor at a given slot on `date`. */
async function seedMeal(
  page: Page,
  date: string,
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  actor: 'mother' | 'baby',
  item: { id: string; name: string; foodId: string },
) {
  await page.evaluate(
    async ({ date, mealType, actor, item }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.meals.put({
        id: `${date}:${mealType}:${actor}`,
        date,
        mealType,
        actor,
        items: [{ ...item, amount: 'portion' }],
        createdAt: `${date}T12:00:00.000Z`,
      });
    },
    { date, mealType, actor, item },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('mixed stage: a slot with both actors logged renders stacked per-actor rows', async ({
  page,
}) => {
  const today = await seedStage(page, 'mixed');
  // Mother logs rice (safe), baby logs potato (safe) — both actors' rows render.
  await seedMeal(page, today, 'lunch', 'mother', { id: 'm1', name: 'Rýže', foodId: 'ryze' });
  await seedMeal(page, today, 'lunch', 'baby', { id: 'b1', name: 'Brambory', foodId: 'brambory' });

  await page.goto(`/day/${today}`);

  const motherRow = page.getByTestId('meal-actor-row-mother').first();
  const babyRow = page.getByTestId('meal-actor-row-baby').first();
  await expect(motherRow).toBeVisible();
  await expect(babyRow).toBeVisible();
  await expect(motherRow).toContainText('Rýže');
  await expect(babyRow).toContainText('Brambory');
  // Both actors filled → one chevron centered across the rows, not one per row (#585).
  await expect(page.getByTestId('meal-row-lunch').getByText('›', { exact: true })).toHaveCount(1);
});

test('mixed stage: one actor empty shows "+" on that row, "›" on the logged row', async ({
  page,
}) => {
  const today = await seedStage(page, 'mixed');
  // Only the mother's lunch is logged; the baby's row stays empty.
  await seedMeal(page, today, 'lunch', 'mother', { id: 'm1', name: 'Rýže', foodId: 'ryze' });

  await page.goto(`/day/${today}`);

  const lunch = page.getByTestId('meal-row-lunch');
  await expect(lunch.getByTestId('meal-actor-row-mother')).toContainText('›');
  await expect(lunch.getByTestId('meal-actor-row-baby')).toContainText('+');
});

test('mixed stage: an empty slot collapses to a single "+" (no actor sub-rows)', async ({
  page,
}) => {
  const today = await seedStage(page, 'mixed');
  // No meals seeded — every slot is both-actors-empty.
  await page.goto(`/day/${today}`);

  const breakfast = page.getByTestId('meal-row-breakfast');
  await expect(breakfast).toBeVisible();
  await expect(breakfast).toContainText('+');
  // Collapsed: no per-actor sub-rows.
  await expect(breakfast.getByTestId('meal-actor-row-mother')).toHaveCount(0);
  await expect(breakfast.getByTestId('meal-actor-row-baby')).toHaveCount(0);
});

test('breastfed stage: the slot collapses to a single row with no actor sub-rows', async ({
  page,
}) => {
  const today = await seedStage(page, 'breastfed');
  await seedMeal(page, today, 'lunch', 'mother', { id: 'm1', name: 'Rýže', foodId: 'ryze' });

  await page.goto(`/day/${today}`);

  const lunch = page.getByTestId('meal-row-lunch');
  await expect(lunch).toBeVisible();
  await expect(lunch).toContainText('Rýže');
  // Single-actor collapse: no actor markers, no per-actor sub-rows.
  await expect(page.getByTestId('meal-actor-row-mother')).toHaveCount(0);
  await expect(page.getByTestId('meal-actor-row-baby')).toHaveCount(0);
});

test('solids stage: the slot collapses to the baby-only single row', async ({ page }) => {
  const today = await seedStage(page, 'solids');
  await seedMeal(page, today, 'lunch', 'baby', { id: 'b1', name: 'Brambory', foodId: 'brambory' });

  await page.goto(`/day/${today}`);

  const lunch = page.getByTestId('meal-row-lunch');
  await expect(lunch).toBeVisible();
  await expect(lunch).toContainText('Brambory');
  await expect(page.getByTestId('meal-actor-row-mother')).toHaveCount(0);
  await expect(page.getByTestId('meal-actor-row-baby')).toHaveCount(0);
});
