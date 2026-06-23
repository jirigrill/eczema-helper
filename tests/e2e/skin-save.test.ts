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

async function completeOnboarding(page: Page) {
  // Seed a post-onboarding state directly into IndexedDB; faster than
  // clicking through the wizard and the wizard itself is covered elsewhere.
  const today = new Date().toISOString().split('T')[0];
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

test('skin save: button disabled when no region is logged', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  const save = page.getByTestId('skin-save');
  await expect(save).toBeDisabled();
});

test('skin save: button enables once any region has level > 0', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await tapRegion(page, 'face'); // activate
  await tapRegion(page, 'face'); // 0→1
  await expect(page.getByTestId('skin-save')).toBeEnabled();
});

// ── Persist ─────────────────────────────────────────────────────────────

test('skin save: persists regions array atomically with empty photos', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
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
  expect(o.regions).toEqual(expect.arrayContaining([
    { id: 'face', level: 1 },
    { id: 'arms', level: 3 },
  ]));
  expect((o.regions as unknown[]).length).toBe(2);
  expect(o.notes).toBe('svědí');
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
  const today = new Date().toISOString().split('T')[0];
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

// ── Day stub reads derived overall severity ─────────────────────────────

test('skin save: the day card reflects the saved observation\'s overall severity', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await page.goto('/skin');

  // face mírné, belly silné — derived overall = silné
  await tapRegion(page, 'face');
  await tapRegion(page, 'face'); // 1
  await tapRegion(page, 'belly'); // activate
  await tapRegion(page, 'belly');
  await tapRegion(page, 'belly');
  await tapRegion(page, 'belly'); // 3

  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  await expect(page.getByTestId('skin-observation-summary')).toContainText(/\bsilné\b/);
});

// ── Reload (live Dexie query) ───────────────────────────────────────────

test('skin save: observation survives reload via live Dexie query', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await page.goto('/skin');
  await tapRegion(page, 'face');
  await tapRegion(page, 'face'); // 1
  await page.getByTestId('skin-save').click();
  await expect(page).toHaveURL(`/day/${today}`);

  await page.reload();
  await expect(page.getByTestId('skin-observation-summary')).toContainText(/\bmírné\b/);
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
