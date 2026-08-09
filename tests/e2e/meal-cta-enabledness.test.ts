 
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { clearDb, startLogging } from './seed';

// Issue #286: dirtiness + finalize-state are owned by `MealEditor`. The
// route reads `editor.canFinalize` for the CTA enabledness — so the button
// must flip from disabled → enabled the instant a clean edit becomes dirty,
// and back to disabled when the change is reverted (notes-only here, since
// notes are easy to set and clear without re-entering the food editor).
//
// Companion to meal-dirty-discard.test.ts:
//  - meal-dirty-discard covers the labels + the discard toast wording.
//  - this spec covers the live `aria-disabled` flip on the SAME page,
//    proving the editor's `dirty` derivation flows through the route.

async function seedLunchWithBrambory(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.meals.put({
      id: `${date}:lunch:mother`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'portion' }],
      createdAt: '2025-06-13T08:00:00.000Z',
    });
  }, today);
  return today;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('"Uložit změny" disables on clean edit, re-enables when notes change, disables again when reverted', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  const cta = page.getByRole('button', { name: 'Uložit změny' });
  await expect(cta).toBeVisible();
  // Clean load → disabled.
  await expect(cta).toHaveAttribute('aria-disabled', 'true');

  // Type into notes → editor.dirty becomes true → CTA enables.
  const notes = page.getByRole('textbox', { name: /Poznámka/ });
  await notes.fill('něco');
  await expect(cta).toHaveAttribute('aria-disabled', 'false');

  // Clear the notes → trim-equal to the loaded baseline (empty) → clean → disabled.
  await notes.fill('');
  await expect(cta).toHaveAttribute('aria-disabled', 'true');
});

test('"Uložit změny" stays disabled when notes only change by surrounding whitespace (trim-aware)', async ({ page }) => {
  await startLogging(page);
  const today = await seedLunchWithBrambory(page);

  await page.goto(`/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  await expect(page.getByRole('button', { name: /^Brambory$/ })).toBeVisible();

  const cta = page.getByRole('button', { name: 'Uložit změny' });
  await expect(cta).toHaveAttribute('aria-disabled', 'true');

  // Whitespace-only padding should not count as a change.
  await page.getByRole('textbox', { name: /Poznámka/ }).fill('   ');
  await expect(cta).toHaveAttribute('aria-disabled', 'true');
});
