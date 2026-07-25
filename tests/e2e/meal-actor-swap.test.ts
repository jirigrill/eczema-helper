import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Swap-on-dirty (issue #571), wired to the mixed-stage actor picker (#576/#569):
// tapping the other pill mid-compose autosaves the departing actor's confirmed
// foods before reloading the target, so flipping between the mother's and the
// baby's lists in one sitting never loses work. On save failure the swap aborts.

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

/** Seed post-onboarding state directly, with the feeding stage set to `mixed`
 *  so the /meal actor picker (Já / Miminko pills) renders. */
async function seedMixedStage(page: Page): Promise<string> {
  const today = new Date().toISOString().split('T')[0]!;
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
      feedingStage: 'mixed',
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: future,
      phases: [{ id: 'reset', type: 'reset', allergenIds: [], startDate: start, endDate: future }],
    });
    // feedingStage is derived from the live settings master switch (#567).
    await db.settings.put({ id: 'singleton', feedingStage: 'mixed' });
  }, today);
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
  return today;
}

/** Confirm Brambory (from Zelenina) and commit the family. */
async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('swap-on-dirty: a confirmed food on the mother survives switching to the baby and back', async ({
  page,
}) => {
  const today = await seedMixedStage(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  const motherPill = page.getByRole('button', { name: 'Já', exact: true });
  const babyPill = page.getByRole('button', { name: 'Miminko', exact: true });
  // Mixed stage renders both pills; mother is active on open.
  await expect(motherPill).toBeVisible();
  await expect(babyPill).toBeVisible();

  // Add a food to the mother's lunch — confirmed, not yet finalized via CTA.
  await addBramboraAndCommit(page);
  await expect(page.getByText('Brambory')).toBeVisible();

  // Switch to the baby: the mother's confirmed food autosaves silently, and the
  // baby's (empty) lunch loads — no Brambory carried over.
  await babyPill.click();
  await expect(page.getByText('Brambory')).toHaveCount(0);

  // Switch back to the mother: the autosaved food is restored from Dexie.
  await motherPill.click();
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('swap-on-dirty aborts on save failure: mother stays active and keeps her food', async ({
  page,
}) => {
  const today = await seedMixedStage(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);
  await expect(page.getByText('Brambory')).toBeVisible();

  // Force the autosave write to throw — the same db singleton the route saves
  // through — so swapActor's finalize() returns !ok and the swap must abort.
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    db.meals.put = () => Promise.reject(new Error('QuotaExceededError'));
  });

  await page.getByRole('button', { name: 'Miminko', exact: true }).click();

  // Swap aborted: the error surfaces, the mother pill stays active, her food is
  // still on screen (working meal preserved — never silently lost).
  await expect(page.getByRole('alert')).toContainText('QuotaExceededError');
  await expect(page.getByRole('button', { name: 'Já', exact: true })).toHaveAttribute(
    'data-active',
    'true',
  );
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('swap round-trip leaves a forward "Hotovo" exit, not a dead-end disabled CTA', async ({
  page,
}) => {
  const today = await seedMixedStage(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  const motherPill = page.getByRole('button', { name: 'Já', exact: true });
  const babyPill = page.getByRole('button', { name: 'Miminko', exact: true });

  // Compose the mother's lunch, swap to the baby (autosaving the mother), then
  // swap back. The mother's meal is now a clean, saved, non-empty edit — the
  // state that used to leave the CTA disabled with the back arrow as the only exit.
  await addBramboraAndCommit(page);
  await babyPill.click();
  await motherPill.click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // The CTA now offers a forward exit: an enabled "Hotovo" that returns to the
  // day overview (never a disabled dead-end).
  const cta = page.getByRole('button', { name: 'Hotovo', exact: true });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('aria-disabled', 'false');
  await cta.click();
  await page.waitForURL(new RegExp(`/day/${today}`));
});

test('"Hotovo" reverts to the save CTA once the returning actor is edited again', async ({
  page,
}) => {
  // Guards the self-clearing contract behind not explicitly resetting
  // `swappedThisSession`: `isDoneState` also gates on `!editor.canFinalize`, so
  // the instant the user edits the returned-to meal it must stop reading as
  // "done" and route back through save. Without this, "Hotovo" would persist
  // over a dirty edit and `goto(returnTo)` would drop the change silently —
  // the exact loss #571 exists to prevent.
  const today = await seedMixedStage(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  const motherPill = page.getByRole('button', { name: 'Já', exact: true });
  const babyPill = page.getByRole('button', { name: 'Miminko', exact: true });

  // Swap round-trip → mother's meal is a clean, saved edit showing "Hotovo".
  await addBramboraAndCommit(page);
  await babyPill.click();
  await motherPill.click();
  await expect(page.getByRole('button', { name: 'Hotovo', exact: true })).toBeVisible();

  // Add a second food: the edit is now dirty, so the CTA must abandon the
  // forward "Hotovo" exit and become the enabled save CTA again.
  await page.getByRole('button', { name: /Ovoce/ }).click();
  await page.getByRole('button', { name: 'Jablko', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Jablko/ }).click();
  await page.getByRole('button', { name: /Uložit Ovoce/ }).click();

  await expect(page.getByRole('button', { name: 'Hotovo', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Uložit změny', exact: true })).toBeVisible();
});

test('"Hotovo" never appears on a clean edit opened directly (no swap)', async ({ page }) => {
  // The forward "Hotovo" exit is gated on `swappedThisSession`: a clean edit
  // reached straight from the day view (never a swap) must keep the established
  // back-arrow-to-exit contract (#277/#286), not sprout a "Hotovo" CTA. Guards
  // against the gate being dropped and every clean edit gaining the exit.
  const today = await seedMixedStage(page);

  // Save a mother lunch, then re-open it fresh — a clean, saved, non-empty
  // edit, the same end-state as the swap round-trip but reached without a swap.
  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();
  await addBramboraAndCommit(page);
  // Fresh compose-new: the finalize CTA reads "Uložit {mealType}", not
  // "Uložit změny" (that label is edit-mode only).
  await page.getByRole('button', { name: 'Uložit Oběd', exact: true }).click();
  await page.waitForURL(new RegExp(`/day/${today}`));

  // Re-enter the same slot via the day-view meal row (the real gesture, which
  // threads date + actor into the /meal URL) — a clean saved edit reached
  // without a swap.
  const lunchRow = page.getByTestId('meal-row-lunch');
  await expect(lunchRow).toBeVisible();
  await lunchRow.click();
  await page.waitForURL(/\/meal\?type=lunch/);
  await expect(page.getByText('Brambory')).toBeVisible();

  // No forward exit — the disabled save CTA + back arrow remains the contract.
  await expect(page.getByRole('button', { name: 'Hotovo', exact: true })).toHaveCount(0);
});
