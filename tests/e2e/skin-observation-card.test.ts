import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.skin_observations.clear();
    db.close();
  });
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function completeOnboarding(page: Page) {
  const today = localToday();
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
  }, today);
}

/** Seed three SkinObservation records for today through the live Dexie db. */
async function seedThreeMixedObservations(page: Page) {
  const today = localToday();
  await page.evaluate(async (date) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    // Local-time strings (no Z) so HH:MM stays stable across CI timezones.
    await db.skin_observations.bulkPut([
      {
        id: 'klidne-morning',
        date,
        createdAt: `${date}T09:12:00.000`,
        regions: [
          { id: 'face', level: 0 },
          { id: 'belly', level: 0 },
        ],
      },
      {
        id: 'stredni-afternoon',
        date,
        createdAt: `${date}T14:30:00.000`,
        regions: [
          { id: 'elbow-folds', level: 2 },
          { id: 'neck', level: 2 },
        ],
        notes: 'po obědě',
      },
      {
        id: 'mirne-evening',
        date,
        createdAt: `${date}T19:45:00.000`,
        regions: [{ id: 'face', level: 1 }],
      },
    ]);
  }, today);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ─────────────────────────────────────────────────────────────────────────

test('three observations render in ascending time order, středn­í row shows the italic note', async ({ page }) => {
  await completeOnboarding(page);
  await seedThreeMixedObservations(page);
  const today = localToday();
  await page.goto(`/day/${today}`);

  const rows = page.getByTestId('skin-observation-row');
  await expect(rows).toHaveCount(3);

  // Top-to-bottom Czech severity labels.
  await expect(rows.nth(0)).toContainText('Klidné');
  await expect(rows.nth(1)).toContainText('Střední');
  await expect(rows.nth(2)).toContainText('Mírné');

  // The středn­í row carries the italic note.
  await expect(rows.nth(1)).toContainText('„po obědě"');
});

test('empty state CTA links to /skin with date + returnTo', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  // Make sure no observations exist for today.
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.skin_observations.clear();
  });
  await page.goto(`/day/${today}`);

  const cta = page.getByRole('link', { name: 'zaznamenat stav kůže' });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(`/skin?date=${today}&returnTo=/day/${today}`);
});
