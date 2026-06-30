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
  // Seed a post-onboarding state directly into IndexedDB; faster than
  // clicking through the wizard and the wizard itself is covered elsewhere.
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
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

async function tapRegion(page: Page, region: string) {
  await page.locator(`[data-region="${region}"]`).click();
}

async function regionLevel(page: Page, region: string): Promise<string | null> {
  return page.locator(`[data-region="${region}"]`).getAttribute('data-level');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Grid + tap rule ─────────────────────────────────────────────────────

test('skin grid: nine regions render with Czech labels', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await expect(page.getByText('Stav kůže', { exact: true })).toBeVisible();

  for (const label of ['Tváře', 'Vlasová část', 'Krk', 'Břicho', 'Záda', 'Paže', 'Loketní jamky', 'Podkolení', 'Nohy']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test('skin grid: tapping inactive region only activates (level stays 0)', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face');
  await expect(page.locator('[data-region="face"]')).toHaveAttribute('data-active', 'true');
  expect(await regionLevel(page, 'face')).toBe('0');
});

test('skin grid: tapping the active region cycles 0→1→2→3→0', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await tapRegion(page, 'face'); // activate
  expect(await regionLevel(page, 'face')).toBe('0');
  await tapRegion(page, 'face'); // 0→1
  expect(await regionLevel(page, 'face')).toBe('1');
  await tapRegion(page, 'face'); // 1→2
  expect(await regionLevel(page, 'face')).toBe('2');
  await tapRegion(page, 'face'); // 2→3
  expect(await regionLevel(page, 'face')).toBe('3');
  await tapRegion(page, 'face'); // 3→0
  expect(await regionLevel(page, 'face')).toBe('0');
});

test('skin grid: switching active region preserves the previous region\'s level', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  // face → mírné (1)
  await tapRegion(page, 'face');
  await tapRegion(page, 'face');
  expect(await regionLevel(page, 'face')).toBe('1');

  // switch to arms — face stays at 1, arms takes over
  await tapRegion(page, 'arms');
  await expect(page.locator('[data-region="arms"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-region="face"]')).toHaveAttribute('data-active', 'false');
  expect(await regionLevel(page, 'face')).toBe('1');
  expect(await regionLevel(page, 'arms')).toBe('0');
});

// ── Save gating ─────────────────────────────────────────────────────────

test('skin save: button enabled on page load — every visit can save a no-change klidné observation', async ({ page }) => {
  // Issue #379 / ADR-0022: klidné is positive evidence. Opening /skin and
  // tapping Uložit immediately must save a "checked, all calm" observation.
  await completeOnboarding(page);
  await page.goto('/skin');
  await expect(page.getByTestId('skin-save')).toBeEnabled();
});

test('skin save: button enables once any region has level > 0', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await tapRegion(page, 'face'); // activate
  await tapRegion(page, 'face'); // 0→1
  await expect(page.getByTestId('skin-save')).toBeEnabled();
});

// ── Persist ─────────────────────────────────────────────────────────────

test('skin save: persists all 9 regions atomically with empty photos', async ({ page }) => {
  // Issue #379 / ADR-0022: every save writes all nine regions. The mother
  // bumps face → mírné, arms → silné; the other seven stay klidné but are
  // recorded as positive evidence ("I checked, those are calm").
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');

  await tapRegion(page, 'face'); // activate
  await tapRegion(page, 'face'); // 1
  await tapRegion(page, 'arms'); // activate
  await tapRegion(page, 'arms'); // 1
  await tapRegion(page, 'arms'); // 2
  await tapRegion(page, 'arms'); // 3
  await page.getByTestId('skin-note').fill('  svědí  ');

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  const result = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const obs = await db.skin_observations.toArray();
    const photos = await db.photos.toArray();
    return {
      obs: obs.map((o: { id: string; date: string; regions: unknown; notes?: string }) => ({
        id: o.id,
        date: o.date,
        regions: o.regions,
        notes: o.notes,
      })),
      photoCount: photos.length,
    };
  });

  expect(result.photoCount).toBe(0);
  expect(result.obs).toHaveLength(1);
  const o = result.obs[0];
  expect(o.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(o.date).toBe(today);
  // All 9 regions present; face=1, arms=3, the other 7 at klidné (0).
  expect((o.regions as unknown[]).length).toBe(9);
  expect(o.regions).toEqual(expect.arrayContaining([
    { id: 'face', level: 1 },
    { id: 'arms', level: 3 },
  ]));
  const calm = (o.regions as Array<{ level: number }>).filter((r) => r.level === 0);
  expect(calm).toHaveLength(7);
  expect(o.notes).toBe('svědí');
});

test('skin save: no-tap Uložit persists 9 klidné regions and day card shows klidné, not empty state', async ({ page }) => {
  // Issue #379 AC: 'no observation today' ≠ 'observation: all klidné'.
  // Page-load Uložit writes a 9-region all-klidné witness; /day shows the
  // klidné severity label + record count, NOT the empty-state copy.
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  // Day-view distinction: at least one row renders with the klidné chip
  // ("Vše klidné"), which only appears when an observation has zero
  // bumped regions — i.e. a klidné witness was saved.
  await expect(page.getByTestId('skin-observation-row').filter({ hasText: 'Vše klidné' })).toHaveCount(1);
  // Empty-state copy must NOT appear — an observation exists.
  await expect(page.getByText('Zatím není záznam pro dnešek')).toHaveCount(0);

  // Persistence shape: 9 records, all level 0.
  const result = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const obs = await db.skin_observations.toArray();
    return obs[0]?.regions as Array<{ id: string; level: number }>;
  });
  expect(result).toHaveLength(9);
  expect(result.every((r) => r.level === 0)).toBe(true);
});

test('skin save: whitespace-only note persists as undefined', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await tapRegion(page, 'belly');
  await tapRegion(page, 'belly');
  await page.getByTestId('skin-note').fill('   ');
  await page.getByTestId('skin-save').click();

  const notes = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const rows = await db.skin_observations.toArray();
    return rows[0]?.notes;
  });

  expect(notes).toBeUndefined();
});

// ── Abandon path ────────────────────────────────────────────────────────

test('skin abandon: back chevron without Uložit persists nothing', async ({ page }) => {
  const today = localToday();
  await completeOnboarding(page);
  await page.goto(`/skin?returnTo=/day/${today}`);

  await tapRegion(page, 'face');
  await tapRegion(page, 'face'); // mírné — but never tap Uložit
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);

  const count = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return db.skin_observations.count();
  });
  expect(count).toBe(0);
});

// ── Day card joins the saved observation via Dexie live query ───────────

test('skin save: the day card renders one chip per bumped region of the saved observation', async ({ page }) => {
  const today = localToday();
  await completeOnboarding(page);
  await page.goto('/skin');

  // face mírné, belly silné — two bumped regions, two chips on the row.
  await tapRegion(page, 'face');
  await tapRegion(page, 'face'); // 1
  await tapRegion(page, 'belly'); // activate
  await tapRegion(page, 'belly');
  await tapRegion(page, 'belly');
  await tapRegion(page, 'belly'); // 3

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  // Both chip texts are present on the saved observation row.
  const row = page.getByTestId('skin-observation-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Tváře');
  await expect(row).toContainText('Břicho');
});

// ── Reload (live Dexie query) ───────────────────────────────────────────

test('skin save: observation survives reload via live Dexie query', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');
  await tapRegion(page, 'face');
  await tapRegion(page, 'face'); // 1
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  await page.reload();
  // Reloaded row carries the Tváře chip.
  await expect(page.getByTestId('skin-observation-row').filter({ hasText: 'Tváře' })).toHaveCount(1);
});

// ── returnTo navigation ─────────────────────────────────────────────────

test('skin returnTo: custom returnTo param is honoured after Uložit', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin?returnTo=/program');
  await tapRegion(page, 'face');
  await tapRegion(page, 'face');
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL('/program');
});

// ── Photo staging ─────────────────────────────────────────────────────────

test('photo button absent when no region active', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await expect(page.getByTestId('skin-add-photo')).not.toBeVisible();
});

test('photo button appears with active region label when region is tapped', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face'); // activate
  const btn = page.getByTestId('skin-add-photo');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Tváře');
});

test('photo button has no capture attribute', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face');
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).not.toHaveAttribute('capture');
});

test('photos staged via file input appear in gallery with correct region label', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'arms'); // activate arms → 'Paže'

  // Upload two photos
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('b') },
  ]);

  await expect(page.locator('[data-testid="skin-photo-gallery"]')).toBeVisible();
  await expect(page.locator('[data-testid="skin-photo-thumb-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="skin-photo-thumb-1"]')).toBeVisible();
  // Both thumbs should show the arms label 'Paže'
  const labels = page.locator('[data-testid="skin-photo-gallery"] span');
  await expect(labels.first()).toContainText('Paže');
});

test('klidné region with staged photo keeps Uložit enabled', async ({ page }) => {
  // Issue #379: under option 2 Uložit is always enabled. This test pins the
  // photo path — staging on a klidné region must not regress the enabled state.
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face'); // activate but NOT cycle — stays klidné (0)

  await expect(page.getByTestId('skin-save')).toBeEnabled();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') },
  ]);

  await expect(page.getByTestId('skin-save')).toBeEnabled();
});

test('deleting a staged photo before Uložit means it never persists', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');
  await tapRegion(page, 'face');

  // Stage two photos
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('b') },
  ]);
  await expect(page.locator('[data-testid="skin-photo-thumb-1"]')).toBeVisible();

  // Delete the first staged photo
  await page.locator('[data-testid="skin-photo-delete-0"]').click();
  await expect(page.locator('[data-testid="skin-photo-thumb-1"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="skin-photo-thumb-0"]')).toBeVisible(); // second becomes index 0

  // Cycle face to mírné so save is enabled even without photos
  await tapRegion(page, 'face'); // 0→1
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  const photoCount = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return db.photos.count();
  });
  // Only the second photo (b.jpg) survived — the deleted first never persisted.
  expect(photoCount).toBe(1);
});

test('Uložit saves observation and staged photos atomically; photos have correct observationId and region', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');
  await tapRegion(page, 'arms'); // activate
  await tapRegion(page, 'arms'); // 0→1

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') },
  ]);

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  const result = await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    const obs = await db.skin_observations.toArray();
    const photos = await db.photos.toArray();
    return {
      obsId: obs[0]?.id as string,
      photoRegion: photos[0]?.region as string,
      photoObsId: photos[0]?.observationId as string,
    };
  });

  expect(result.obsId).toBeTruthy();
  expect(result.photoRegion).toBe('arms');
  expect(result.photoObsId).toBe(result.obsId);
});

// ── Day card joins photos via observationId (issue #371) ───────────────────

test('saved photos appear on /day/<today> Foto kůže card with region labels and correct count', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');

  // Stage two arms photos, then cycle arms to mírné and save.
  await tapRegion(page, 'arms'); // activate → 'Paže'
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('b') },
  ]);
  await tapRegion(page, 'arms'); // 0→1 so Uložit is unambiguously enabled

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  // The Foto kůže card lists both photos with the region label beneath.
  await expect(page.getByText('Foto kůže')).toBeVisible();
  // Count suffix from snimkyCs(2) is "2 snímky" (Czech grammar).
  await expect(page.getByText('2 snímky')).toBeVisible();
  // Region label appears under each thumb — at least two 'Paže' labels visible.
  // The photo-card thumb labels are rendered as <span class="text-[10px]"…>,
  // which distinguishes them from the SkinObservationCard secondary line
  // (class="text-[11px]") so the same region word doesn't strict-mode collide.
  const photoLabels = page.locator('span.text-\\[10px\\]', { hasText: 'Paže' });
  await expect(photoLabels).toHaveCount(2);
});

test('day card photo panel survives reload via live Dexie query (join through observationId)', async ({ page }) => {
  await completeOnboarding(page);
  const today = localToday();
  await page.goto('/skin');
  await tapRegion(page, 'belly');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'belly.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('belly') },
  ]);
  await tapRegion(page, 'belly'); // 0→1
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  await page.reload();
  // Foto kůže card still shows the photo + the Břicho label after reload.
  await expect(page.getByText('Foto kůže')).toBeVisible();
  await expect(page.getByText('1 snímek')).toBeVisible();
  // Scope to the photo-card thumb label (text-[10px]) so it doesn't strict-
  // mode collide with the SkinObservationCard secondary line (text-[11px]).
  await expect(page.locator('span.text-\\[10px\\]', { hasText: 'Břicho' })).toBeVisible();
});

// ── Lightbox open/close (issue #362 AC5) ──────────────────────────────────

test('tapping a staged thumb opens the lightbox; × button closes it', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
  ]);
  await expect(page.getByTestId('skin-photo-thumb-0')).toBeVisible();
  await expect(page.getByTestId('skin-photo-lightbox')).toHaveCount(0);

  await page.getByTestId('skin-photo-thumb-0').click();
  await expect(page.getByTestId('skin-photo-lightbox')).toBeVisible();

  await page.getByTestId('skin-lightbox-close').click();
  await expect(page.getByTestId('skin-photo-lightbox')).toHaveCount(0);
});

test('tapping the lightbox backdrop dismisses it', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await tapRegion(page, 'face');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
  ]);

  await page.getByTestId('skin-photo-thumb-0').click();
  const lightbox = page.getByTestId('skin-photo-lightbox');
  await expect(lightbox).toBeVisible();

  // Backdrop closes only when e.target === e.currentTarget — click the
  // top-left corner of the dialog, outside the centered image.
  const box = await lightbox.boundingBox();
  if (!box) throw new Error('lightbox has no bounding box');
  await page.mouse.click(box.x + 5, box.y + 5);

  await expect(page.getByTestId('skin-photo-lightbox')).toHaveCount(0);
});
