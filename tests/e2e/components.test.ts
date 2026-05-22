/**
 * Visual snapshot tests for variant-bearing components.
 *
 * jsdom does not process CSS, so Vitest unit tests cannot verify that
 * Tailwind opacity variants (bg-primary/5, border-success/30, …) render
 * the right colours. These tests screenshot the real rendered elements in
 * Chromium and diff against stored baselines.
 *
 * First run (generate baselines):
 *   bunx playwright test tests/e2e/components.test.ts --update-snapshots
 *
 * Subsequent runs compare against those baselines automatically.
 */
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    db.close();
  });
}

/**
 * Seed Dexie with a generated schedule starting `daysAgo` days in the past.
 * Moderate severity: reset=5d, elimination=14d, reintroduction=4d each.
 *
 * daysAgo=10 → today is day 11 of the 14-day elimination phase.
 * daysAgo=22 → today is day 3 of the first reintroduction phase (soy).
 */
async function seedSchedule(page: Page, daysAgo: number) {
  await page.evaluate(async (offset: number) => {
    const builderPath  = '/src/lib/domain/schedule-builder.ts';
    const qRepoPath    = '/src/lib/adapters/dexie-questionnaire-repository.ts';
    const sRepoPath    = '/src/lib/adapters/dexie-schedule-repository.ts';
    const dbPath       = '/src/lib/db/atopic-db.ts';
    const categoriesPath = '/src/lib/data/categories.ts';
    const { generateSchedule }             = await import(/* @vite-ignore */ builderPath);
    const { DexieQuestionnaireRepository } = await import(/* @vite-ignore */ qRepoPath);
    const { DexieScheduleRepository }      = await import(/* @vite-ignore */ sRepoPath);
    const { AtopicDb }                     = await import(/* @vite-ignore */ dbPath);
    const { DEFAULT_TESTED_ALLERGENS }     = await import(/* @vite-ignore */ categoriesPath);

    const db = new AtopicDb();
    const qRepo = new DexieQuestionnaireRepository(db);
    const sRepo = new DexieScheduleRepository(db);

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
    await qRepo.save(answers);
    await sRepo.save(schedule);
    db.close();
  }, daysAgo);
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function advanceToOnboardingStep(page: Page, step: number) {
  await page.getByRole('button', { name: 'Začít' }).click();
  if (step === 1) return;

  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  if (step === 2) return;

  if (step === 3) return;

  await page.getByRole('button', { name: 'Pokračovat' }).click();
  if (step === 4) return;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ---------------------------------------------------------------------------
// InfoBanner — info variant (onboarding step 3)
// ---------------------------------------------------------------------------

test('InfoBanner info variant colour snapshot', async ({ page }) => {
  await advanceToOnboardingStep(page, 3);
  const banner = page.locator('[data-state="info"]').first();
  await expect(banner).toBeVisible();
  await expect(banner).toHaveScreenshot('infobanner-info.png');
});

// ---------------------------------------------------------------------------
// InfoBanner — danger variant (onboarding step 4)
// ---------------------------------------------------------------------------

test('InfoBanner danger variant colour snapshot', async ({ page }) => {
  await advanceToOnboardingStep(page, 4);
  const banner = page.locator('[data-state="danger"]').first();
  await expect(banner).toBeVisible();
  await expect(banner).toHaveScreenshot('infobanner-danger.png');
});

// ---------------------------------------------------------------------------
// InfoBanner — warning variant (meal page, elimination phase)
// Seed a schedule 10 days in the past → today = day 11 of elimination.
// eliminatedToday is non-empty → warning banner visible on meal page.
// ---------------------------------------------------------------------------

test('InfoBanner warning variant colour snapshot', async ({ page }) => {
  await seedSchedule(page, 10);
  await page.goto('/meal');

  const banner = page.locator('[data-state="warning"]').first();
  await expect(banner).toBeVisible();
  await expect(banner).toHaveScreenshot('infobanner-warning.png');
});

// ---------------------------------------------------------------------------
// InfoBanner — success variant (meal page, reintroduction phase)
// Seed a schedule 22 days in the past → today = day 3 of soy reintroduction.
// reintroInfo is non-null → success dosing-guidance banner visible.
// ---------------------------------------------------------------------------

test('InfoBanner success variant colour snapshot', async ({ page }) => {
  await seedSchedule(page, 22);
  await page.goto('/meal');

  const banner = page.locator('[data-state="success"]').first();
  await expect(banner).toBeVisible();
  await expect(banner).toHaveScreenshot('infobanner-success.png');
});

// ---------------------------------------------------------------------------
// PhaseBadge — today page after onboarding
// ---------------------------------------------------------------------------

test('PhaseBadge colour snapshot on today page', async ({ page }) => {
  await seedSchedule(page, 10);
  await page.goto('/today');

  const badge = page.locator('span[data-state]').first();
  await expect(badge).toBeVisible();
  await expect(badge).toHaveScreenshot('phasebadge.png');
});
