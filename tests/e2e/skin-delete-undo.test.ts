import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E: /skin delete with post-delete undo (issue #394). Seeds an observation
 * with one photo, deletes it via the ⋯ overflow, verifies the row is gone,
 * then follows the undo toast back to /skin to restore the observation with
 * its original id/createdAt/photo intact.
 */

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
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

async function seedObservationWithPhoto(
  page: Page,
): Promise<{ id: string; createdAt: string; date: string; photoId: string }> {
  const today = localToday();
  const observationId = 'obs-e2e-delete';
  const photoId = 'photo-e2e-delete';
  const createdAt = `${today}T09:12:00.000`;
  await page.evaluate(
    async ({ date, id, createdAtIso, photoIdArg }) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      await db.skin_observations.put({
        id,
        date,
        createdAt: createdAtIso,
        regions: [
          { id: 'face', level: 2 },
          { id: 'arms', level: 0 },
          { id: 'back', level: 0 },
          { id: 'belly', level: 0 },
          { id: 'elbow-folds', level: 0 },
          { id: 'knee-folds', level: 0 },
          { id: 'legs', level: 0 },
          { id: 'neck', level: 0 },
          { id: 'scalp', level: 0 },
        ],
        notes: 'kůže svědí',
      });
      const blob = new Blob(['x'], { type: 'image/jpeg' });
      await db.photos.put({
        id: photoIdArg,
        observationId: id,
        region: 'face',
        capturedAt: createdAtIso,
        blob,
      });
    },
    { date: today, id: observationId, createdAtIso: createdAt, photoIdArg: photoId },
  );
  return { id: observationId, createdAt, date: today, photoId };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

test('delete → undo restores observation with original id, createdAt, regions, note, and photo', async ({ page }) => {
  await completeOnboarding(page);
  const seeded = await seedObservationWithPhoto(page);

  // Enter edit mode via the direct URL.
  await page.goto(`/skin?date=${seeded.date}&id=${seeded.id}&returnTo=/day/${seeded.date}`);
  await expect(page.getByTestId('skin-note')).toHaveValue('kůže svědí');
  await expect(page.getByTestId('skin-region-face')).toHaveAttribute('data-level', '2');

  // ⋯ overflow → confirm sheet → destructive confirm.
  await page.getByTestId('skin-overflow').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Smazat pozorování' }).click();

  // Landed on /day/{today} and the observation is gone from Dexie.
  await expect(page).toHaveURL(`/day/${seeded.date}`);
  const rowsAfterDelete = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      return db.skin_observations.get(id);
    },
    seeded.id,
  );
  expect(rowsAfterDelete).toBeUndefined();

  // Undo the delete via the toast.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(
    `/skin?date=${seeded.date}&id=${seeded.id}&returnTo=%2Fday%2F${seeded.date}`,
  );

  // Form is populated from the discard buffer.
  await expect(page.getByTestId('skin-note')).toHaveValue('kůže svědí');
  await expect(page.getByTestId('skin-region-face')).toHaveAttribute('data-level', '2');
  await expect(page.getByTestId('skin-photo-thumb-0')).toBeVisible();
  // Overflow is still there — same edit-mode chrome.
  await expect(page.getByTestId('skin-overflow')).toBeVisible();
  // Uložit is enabled (the whole rehydrated form is dirty against a zero baseline).
  await expect(page.getByTestId('skin-save')).toBeEnabled();

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${seeded.date}`);

  // Observation is back in Dexie with original id + createdAt.
  const restored = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      return db.skin_observations.get(id);
    },
    seeded.id,
  );
  expect(restored?.id).toBe(seeded.id);
  expect(restored?.createdAt).toBe(seeded.createdAt);
  expect(restored?.notes).toBe('kůže svědí');
  expect(restored?.regions).toEqual(
    expect.arrayContaining([{ id: 'face', level: 2 }]),
  );

  const photoCount = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      const rows = await db.photos.where('observationId').equals(id).toArray();
      return rows.length;
    },
    seeded.id,
  );
  expect(photoCount).toBe(1);

  // Photo id preservation across delete + undo (issue #408 item 1 / PRD #389
  // promise). The `restore` verb must reinsert the photo verbatim, not mint
  // a fresh id.
  const photoIds = await page.evaluate(
    async (id) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      const rows = await db.photos.where('observationId').equals(id).toArray();
      return rows.map((r: { id: string }) => r.id);
    },
    seeded.id,
  );
  expect(photoIds).toEqual([seeded.photoId]);
});
