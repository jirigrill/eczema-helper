import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Skin-status evaluation for reset/elimination phases (issue #332).
// Seeds a schedule whose `reset` phase ENDS today, so:
//   - today is a phase-end day → FAB evaluate surfaces the entry point (AC4)
//   - reset is the current phase → its verdict shows in the /program hero (AC3)

const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString().split('T')[0];

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.settings.clear();
    await db.evaluations.clear();
    db.close();
  });
}

// Reset phase from (today-4) to today → today is its last day.
async function seedResetEndingToday(page: Page) {
  const start = iso(Date.now() - 4 * DAY);
  const today = iso(Date.now());
  await page.evaluate(async ({ start, today }) => {
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
      feedingStage: 'breastfed',
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: today,
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: start, endDate: today },
      ],
    });
    // The app derives feedingStage from the live settings master switch (#567);
    // seed it so a directly-seeded schedule renders without going through onboarding.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  }, { start, today });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('FAB evaluate on a reset phase-end day opens /evaluation with the skin-status vocabulary', async ({ page }) => {
  const today = iso(Date.now());
  await seedResetEndingToday(page);
  await page.goto(`/day/${today}`);
  await expect(page.getByRole('button', { name: 'Přidat záznam' })).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await expect(page.getByText('Co chceš přidat?')).toBeVisible();
  await page.getByTestId('fab-action-evaluate').click();

  await expect(page).toHaveURL(/\/evaluation\?phase=reset/);
  // AC1: skin-status outcomes render, not the allergen-test ones.
  // exact:true so a card label isn't confused with its longer subtitle.
  await expect(page.getByText('Zlepšení', { exact: true })).toBeVisible();
  await expect(page.getByText('Beze změny', { exact: true })).toBeVisible();
  await expect(page.getByText('Zhoršení', { exact: true })).toBeVisible();
  await expect(page.getByText('Nová ložiska', { exact: true })).toBeVisible();
  await expect(page.getByText('Toleruje', { exact: true })).not.toBeVisible();
});

test('saving a skin-status verdict persists it, leaves the schedule unchanged, and shows on the program hero', async ({ page }) => {
  const today = iso(Date.now());
  await seedResetEndingToday(page);
  await page.goto(`/evaluation?phase=reset&date=${today}&returnTo=${encodeURIComponent(`/day/${today}`)}`);

  await expect(page.getByText('Jak se kůže miminka měla?')).toBeVisible();
  await page.getByText('Zlepšení').click();
  await page.getByRole('button', { name: 'Uložit vyhodnocení' }).click();

  // AC2: confirmation toast, then back to the day view.
  await expect(page.getByText('Vyhodnocení uloženo.')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/day/${today}`));

  // AC2: schedule structurally unchanged — still a single reset phase, no rest inserted.
  const phaseCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const s = await db.schedule.get('singleton');
    return s?.phases.length ?? 0;
  });
  expect(phaseCount).toBe(1);

  // AC3: the recorded verdict renders on the program timeline (reset is the current phase → hero detail).
  await page.goto('/program');
  await expect(page.getByText('Zlepšení').first()).toBeVisible();
});
