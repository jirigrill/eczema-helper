import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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

async function completeOnboarding(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
  await page.waitForURL(/\/day\//);
}

/** Seed a finalized meal directly into IndexedDB. */
async function seedMeal(page: Page, mealType: string, today: string) {
  await page.evaluate(
    async ({ mealType, today }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.meals.put({
        id: `${today}:${mealType}`,
        date: today,
        mealType,
        actor: 'mother',
        items: [
          {
            id: 'seed-item-1',
            name: 'Brambory',
            foodId: 'potato',
            amount: 'portion',
          },
        ],
        createdAt: new Date().toISOString(),
      });
    },
    { mealType, today },
  );
}

/** Add Brambory via the Zelenina drill-in and commit the family. */
async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ── Load: empty working list → tap any pill → load that slot ──────────────────

test('pills: empty working list — tapping a different pill loads that slot (type changes)', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Start on /meal — default type is 'lunch' (Oběd)
  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // The Oběd pill should visually be the current one (outline style is not easily
  // assertable in PW, but we confirm it doesn't trigger a discard prompt)
  await page.getByRole('button', { name: 'Snídaně', exact: true }).click();

  // No discard prompt — the type simply changed
  await expect(page.getByText('Jídlo zahozeno')).not.toBeVisible();

  // CTA label should now show Snídaně as the target type
  await expect(page.getByRole('button', { name: /Snídaně/ }).last()).toBeVisible();
});

// ── Load: finalized meal in slot — pill fill state ────────────────────────────

test('pills: occupied slot renders as filled (active) pill', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Seed a finalized breakfast into the DB before loading the page
  await seedMeal(page, 'breakfast', today);

  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Snídaně pill should have data-active="true" (filled = occupied)
  const breakfastPill = page.getByRole('button', { name: 'Snídaně', exact: true });
  await expect(breakfastPill).toHaveAttribute('data-active', 'true');

  // Oběd (current) pill should NOT be data-active (it uses chip--current, not chip--active)
  const lunchPill = page.getByRole('button', { name: 'Oběd', exact: true });
  await expect(lunchPill).toHaveAttribute('data-active', 'false');
});

// ── Move: non-empty working list + empty target ───────────────────────────────

test('pills: move — non-empty working list + empty target pill → type changes, no discard toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Working list is now non-empty. Tap an empty pill (Snídaně).
  await page.getByRole('button', { name: 'Snídaně', exact: true }).click();

  // MOVE: no discard guard — foods just moved to breakfast slot
  await expect(page.getByText('Jídlo zahozeno')).not.toBeVisible();

  // CTA label now reflects Snídaně
  await expect(page.getByRole('button', { name: /Snídaně/ }).last()).toBeVisible();

  // Working list still shows the food (nothing was lost)
  await expect(page.getByText('Brambory')).toBeVisible();
});

// ── Switch-away: non-empty working list + occupied target ─────────────────────

test('pills: switch-away — non-empty working list + occupied pill → discard guard fires', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Seed a finalized breakfast
  await seedMeal(page, 'breakfast', today);

  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Working list non-empty, Snídaně pill is filled (occupied). Tap it.
  await page.getByRole('button', { name: 'Snídaně', exact: true }).click();

  // Discard guard should fire (same as back-arrow with non-empty list from #247)
  // The page navigates away and shows the discard toast, OR shows an in-page prompt.
  // Based on the existing discard pattern the page navigates to returnTo and shows a toast.
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();
});

// ── Block: MOVE cannot overwrite an occupied slot ─────────────────────────────

test('pills: block — tapping an occupied pill with non-empty working list triggers switch-away, not silent overwrite', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await seedMeal(page, 'dinner', today);

  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Tap Večeře (filled/occupied pill) — this should NOT silently merge/overwrite.
  // It must trigger switch-away (discard guard).
  await page.getByRole('button', { name: 'Večeře', exact: true }).click();

  // Discard guard must appear, proving the MOVE was blocked and switch-away ran.
  await expect(page.getByText('Jídlo zahozeno')).toBeVisible();
});

// ── Autosave removed: switching pill does not persist the working list ──────────

test('pills: switching pill does not auto-save the current working list', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?returnTo=/day/${today}&type=lunch`);
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await addBramboraAndCommit(page);

  // Move to snack slot (empty)
  await page.getByRole('button', { name: 'Svačina', exact: true }).click();

  // Navigate to /day — no meal card should have been auto-saved
  await page.goto(`/day/${today}`);
  await expect(page.getByText('Oběd')).not.toBeVisible();
  await expect(page.getByText('Svačina')).not.toBeVisible();
});
