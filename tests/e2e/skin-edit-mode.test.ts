import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E: /skin edit mode with dirty-edit back-out (issue #393). The compose
 * flow is covered elsewhere. Here we seed a persisted observation, open the
 * edit URL directly (issue #392 wraps the day-card row in the link that
 * produces the same URL; this test doesn't depend on that slice), and drive
 * the clean-edit gate + back-out lifecycle end to end.
 */

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.settings.clear();
    await db.skin_observations.clear();
    await db.photos.clear();
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
      feedingStage: 'breastfed',
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
    // The app derives feedingStage from the live settings master switch (#567);
    // seed it so a directly-seeded schedule renders without going through onboarding.
    await db.settings.put({ id: 'singleton', feedingStage: 'breastfed' });
  }, today);
}

async function seedObservation(page: Page): Promise<{ id: string; createdAt: string; date: string }> {
  const today = localToday();
  const observationId = 'obs-e2e-edit';
  const createdAt = `${today}T09:12:00.000`;
  await page.evaluate(
    async ({ date, id, createdAtIso }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.skin_observations.put({
        id,
        date,
        createdAt: createdAtIso,
        regions: [
          { id: 'face', level: 1 },
          { id: 'arms', level: 0 },
          { id: 'back', level: 0 },
          { id: 'belly', level: 0 },
          { id: 'elbow-folds', level: 0 },
          { id: 'knee-folds', level: 0 },
          { id: 'legs', level: 0 },
          { id: 'neck', level: 0 },
          { id: 'scalp', level: 0 },
        ],
        notes: 'zkouška',
      });
    },
    { date: today, id: observationId, createdAtIso: createdAt },
  );
  return { id: observationId, createdAt, date: today };
}

async function seedObservationWithTwoPhotos(page: Page): Promise<{ id: string; date: string; photoIds: string[] }> {
  const today = localToday();
  const observationId = 'obs-e2e-photos';
  const photoIds = ['photo-keep', 'photo-remove'];
  await page.evaluate(
    async ({ date, id, keepId, removeId }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.skin_observations.put({
        id,
        date,
        createdAt: `${date}T09:12:00.000`,
        regions: [
          { id: 'face', level: 1 },
          { id: 'arms', level: 0 },
          { id: 'back', level: 0 },
          { id: 'belly', level: 0 },
          { id: 'elbow-folds', level: 0 },
          { id: 'knee-folds', level: 0 },
          { id: 'legs', level: 0 },
          { id: 'neck', level: 0 },
          { id: 'scalp', level: 0 },
        ],
      });
      const blob = new Blob(['x'], { type: 'image/jpeg' });
      await db.photos.bulkPut([
        { id: keepId, observationId: id, region: 'face', capturedAt: `${date}T09:12:00.000`, blob },
        { id: removeId, observationId: id, region: 'face', capturedAt: `${date}T09:12:01.000`, blob },
      ]);
    },
    { date: today, id: observationId, keepId: photoIds[0], removeId: photoIds[1] },
  );
  return { id: observationId, date: today, photoIds };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('dirty back-out preserves edits; re-open restores them; save updates the row while preserving createdAt', async ({ page }) => {
  await completeOnboarding(page);
  const seeded = await seedObservation(page);

  // Enter edit mode via the direct URL.
  await page.goto(`/skin?date=${seeded.date}&id=${seeded.id}&returnTo=/day/${seeded.date}`);

  // Pre-fill: note is present, face is at level 1.
  await expect(page.getByTestId('skin-note')).toHaveValue('zkouška');
  await expect(page.getByTestId('skin-region-face')).toHaveAttribute('data-level', '1');

  // Bump arms 0→1 to dirty the edit.
  await page.getByTestId('skin-region-arms').click();
  await page.getByTestId('skin-region-arms').click();
  await expect(page.getByTestId('skin-region-arms')).toHaveAttribute('data-level', '1');

  // Back arrow — dirty edit → buffer + navigate to /day.
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${seeded.date}`);

  // Day card row still shows the original chips (edit not persisted yet).
  const rows = page.getByTestId('skin-observation-row');
  await expect(rows).toHaveCount(1);
  // The seeded observation has face=1 → only "Tváře" chip; arms would show if persisted.
  await expect(rows.first()).toContainText('Tváře');
  await expect(rows.first()).not.toContainText('Paže');

  // Re-enter through the discard-toast Undo — a client-side goto that
  // preserves the in-memory buffer. Full page.goto would reset the store.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(
    `/skin?date=${seeded.date}&id=${seeded.id}&returnTo=%2Fday%2F${seeded.date}`,
  );
  await expect(page.getByTestId('skin-region-arms')).toHaveAttribute('data-level', '1');
  // Uložit is enabled (dirty vs the persisted baseline).
  await expect(page.getByTestId('skin-save')).toBeEnabled();

  // Save — Dexie row is updated in place, createdAt preserved.
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${seeded.date}`);

  const updated = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      return db.skin_observations.get(id);
    },
    seeded.id,
  );
  expect(updated?.createdAt).toBe(seeded.createdAt);
  expect(updated?.regions).toEqual(
    expect.arrayContaining([{ id: 'arms', level: 1 }, { id: 'face', level: 1 }]),
  );
});

test('photo staging: removing one persisted photo + adding one writes exactly two photos on save', async ({ page }) => {
  await completeOnboarding(page);
  const seeded = await seedObservationWithTwoPhotos(page);

  await page.goto(`/skin?date=${seeded.date}&id=${seeded.id}&returnTo=/day/${seeded.date}`);
  // Both persisted photos are in the gallery.
  await expect(page.getByTestId('skin-photo-thumb-0')).toBeVisible();
  await expect(page.getByTestId('skin-photo-thumb-1')).toBeVisible();

  // Mark the second persisted photo for removal.
  await page.getByTestId('skin-photo-delete-1').click();
  await expect(page.getByTestId('skin-photo-thumb-1')).toHaveAttribute('data-marked-for-removal', 'true');

  // Stage an add — activate face (already logged) then upload a file.
  await page.getByTestId('skin-region-face').click();
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'new.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('new'),
  });
  // The staged add appears at index 2 (persisted 0, persisted 1 marked, staged 2).
  await expect(page.getByTestId('skin-photo-thumb-2')).toBeVisible();

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${seeded.date}`);

  const photoCount = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      const rows = await db.photos.where('observationId').equals(id).toArray();
      return rows.length;
    },
    seeded.id,
  );
  expect(photoCount).toBe(2);
});
