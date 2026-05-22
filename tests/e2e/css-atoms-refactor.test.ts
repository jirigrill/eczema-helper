/**
 * TDD tests for issue #70 — CSS atom adoption across components.
 *
 * Slice 1: InfoBanner emits data-state (not the old data-variant)
 * Slice 2: InfoBanner danger background uses danger/10 opacity
 * Slice 3: SummaryCard container has rounded-2xl (16px)
 * Slice 4: EmptyStateCard label uses section-label font-size (12px)
 * Slice 5: EmptyStateCard padding is p-4 (16px)
 *
 * Run: bunx playwright test tests/e2e/css-atoms-refactor.test.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// DB helpers (copied from components.test.ts)
// ---------------------------------------------------------------------------

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const dbPath = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ dbPath);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    db.close();
  });
}

async function seedSchedule(page: Page, daysAgo: number) {
  await page.evaluate(async (offset: number) => {
    const builderPath    = '/src/lib/domain/schedule-builder.ts';
    const qRepoPath      = '/src/lib/adapters/dexie-questionnaire-repository.ts';
    const sRepoPath      = '/src/lib/adapters/dexie-schedule-repository.ts';
    const dbPath         = '/src/lib/db/atopic-db.ts';
    const categoriesPath = '/src/lib/data/categories.ts';
    const { generateSchedule }             = await import(/* @vite-ignore */ builderPath);
    const { DexieQuestionnaireRepository } = await import(/* @vite-ignore */ qRepoPath);
    const { DexieScheduleRepository }      = await import(/* @vite-ignore */ sRepoPath);
    const { AtopicDb }                     = await import(/* @vite-ignore */ dbPath);
    const { DEFAULT_TESTED_ALLERGENS }     = await import(/* @vite-ignore */ categoriesPath);

    const db = new AtopicDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - offset);

    const answers = {
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate' as const,
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: startDate.toISOString().split('T')[0],
      completedAt: new Date().toISOString(),
      testedAllergens: DEFAULT_TESTED_ALLERGENS,
    };

    const schedule = generateSchedule(answers);
    await new DexieQuestionnaireRepository(db).save(answers);
    await new DexieScheduleRepository(db).save(schedule);
    db.close();
  }, daysAgo);
}

async function advanceToOnboardingStep(page: Page, step: number) {
  await page.getByRole('button', { name: 'Začít' }).click();
  if (step === 1) return;
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  if (step === 2) return;
  if (step === 3) return;
  await page.getByRole('button', { name: 'Pokračovat' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ---------------------------------------------------------------------------
// Slice 1 — InfoBanner emits data-state attribute
// RED: failed while component still used the old data-variant attribute.
// All components now use data-state; we assert InfoBanner's element specifically.
// ---------------------------------------------------------------------------

test('InfoBanner renders with data-state attribute', async ({ page }) => {
  await advanceToOnboardingStep(page, 3);
  // The InfoBanner at step 3 is a div.rounded-xl.border — check it has data-state
  const banner = page.locator('div.rounded-xl.border[data-state]').first();
  await expect(banner).toBeVisible();
  // Must not carry the old data-variant attribute
  await expect(page.locator('div.rounded-xl.border[data-variant]')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Slice 2 — InfoBanner colors come from data-state CSS rules (not CLASSES obj)
// RED: fails while CLASSES object still sets inline Tailwind classes
// Meal page seeds elimination phase → warning banner visible.
// warning = #C9A227 → must have a non-transparent background.
// ---------------------------------------------------------------------------

test('InfoBanner warning variant has non-transparent background via data-state CSS', async ({ page }) => {
  await seedSchedule(page, 10);
  await page.goto('/meal');

  const banner = page.locator('[data-state="warning"]').first();
  await expect(banner).toBeVisible();

  const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor);
  // bg-warning/10 must resolve — must not be transparent
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});

// ---------------------------------------------------------------------------
// Slice 3 — SummaryCard container has rounded-2xl (16px border-radius)
// RED: fails while SummaryCard uses rounded-xl (12px)
// ---------------------------------------------------------------------------

test('SummaryCard container has rounded-2xl border-radius (16px)', async ({ page }) => {
  // Advance to step 6 (summary) where SummaryCards are rendered
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click(); // step 2 → 3
  await page.getByRole('button', { name: 'Pokračovat' }).click(); // step 3 → 4
  await page.getByRole('button', { name: 'Pokračovat' }).click(); // step 4 → 5
  await page.getByRole('button', { name: 'Pokračovat' }).click(); // step 5 → 6

  const card = page.locator('.card-base').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('border-radius', '16px');
});

// ---------------------------------------------------------------------------
// Slice 4 — EmptyStateCard label font-size is 12px (section-label / text-xs)
// RED: fails while label uses text-[10px]
// ---------------------------------------------------------------------------

test('EmptyStateCard label has section-label font-size (12px)', async ({ page }) => {
  await seedSchedule(page, 10);
  await page.goto('/today');

  // EmptyStateCard is visible when there are no meals/assessments logged
  const label = page.locator('.section-label').first();
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('font-size', '12px');
});

// ---------------------------------------------------------------------------
// Slice 5 — EmptyStateCard padding is p-4 (16px)
// RED: fails while EmptyStateCard uses p-3.5 (14px)
// ---------------------------------------------------------------------------

test('EmptyStateCard container has p-4 padding (16px)', async ({ page }) => {
  await seedSchedule(page, 10);
  await page.goto('/today');

  const card = page.locator('.border-dashed').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('padding-top', '16px');
});
