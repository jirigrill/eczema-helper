import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Onboarding seeds feedingStage 'breastfed' (ADR-0001 v1 default); the Settings
// picker is the live master switch that changes it afterwards (#567). This
// exercises that second half end to end: pick a different stage in Settings and
// confirm the settings singleton — the sole source of truth — is updated live
// and survives a reload.

async function completeOnboarding(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();

  // Step 2 — birthdate + feeding stage (breastfed pre-selected as the v1 default)
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
  await page.waitForURL(/\/day\//);
}

async function storedFeedingStage(page: Page): Promise<string | undefined> {
  return page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db, SINGLETON_ID } = await import(/* @vite-ignore */ path);
    const settings = await db.settings.get(SINGLETON_ID);
    return settings?.feedingStage;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Settings picker changes the feeding-stage master switch live and it persists', async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.goto('/settings');

  // The onboarding default ("Plně kojené" = breastfed) is the active pill.
  const breastfedPill = page.getByRole('button', { name: 'Plně kojené', exact: true });
  const solidsPill = page.getByRole('button', { name: 'Plně na příkrmech', exact: true });
  await expect(breastfedPill).toHaveAttribute('data-active', 'true');
  await expect(solidsPill).toHaveAttribute('data-active', 'false');
  expect(await storedFeedingStage(page)).toBe('breastfed');

  // Pick a different stage — the live edit goes through setFeedingStage.
  await solidsPill.click();

  // The active pill flips live (settingsContext re-emits) …
  await expect(solidsPill).toHaveAttribute('data-active', 'true');
  await expect(breastfedPill).toHaveAttribute('data-active', 'false');
  // … and the settings singleton (sole source of truth) reflects the new value.
  await expect.poll(() => storedFeedingStage(page)).toBe('solids');

  // Reload: the master switch survives and the picker shows the new active pill.
  await page.reload();
  await expect(solidsPill).toHaveAttribute('data-active', 'true');
  expect(await storedFeedingStage(page)).toBe('solids');
});
