import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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

async function completeOnboarding(page: Page) {
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
  // Wait for the app to finish saving to IndexedDB and navigate. Without this,
  // page.goto('/skin') can hard-reload before the DB writes commit, causing
  // the scheduleContext liveQuery to fire empty on the next page load.
  await expect(page).toHaveURL('/today');
}

/** Seed a reintroduction schedule so reintroInfo is non-null for today. */
async function seedReintroductionSchedule(page: Page) {
  await page.evaluate(async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const future = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: yesterday,
      completedAt: new Date().toISOString(),
      testedAllergens: ['dairy'],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: yesterday,
      estimatedEndDate: future,
      phases: [{
        id: 'reintro-dairy',
        type: 'reintroduction',
        allergenIds: ['dairy'],
        startDate: today,
        endDate: future,
      }],
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.goto('/', { waitUntil: 'networkidle' });
});

test('skin save: button disabled after save, only one observation written', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await page.getByRole('button', { name: 'Zlepšení' }).click();
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();

  // Button becomes disabled and relabelled — double-submit is blocked
  const saveBtn = page.getByRole('button', { name: '✓ Uloženo' });
  await expect(saveBtn).toBeVisible();
  await expect(saveBtn).toBeDisabled();

  const count = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    return db.skin_observations.count();
  });
  expect(count).toBe(1);
});

test('skin save: select status, hit Uložit, navigates to /today', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  await page.goto('/skin?returnTo=/today');
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();
  await expect(page.getByText(/Sledujte reakci na/)).not.toBeVisible();

  // Save button not yet present (no status selected)
  await expect(page.getByRole('button', { name: 'Uložit hodnocení' })).not.toBeVisible();

  // Select a status
  await page.getByRole('button', { name: 'Zlepšení' }).click();

  // Save button now visible and enabled
  const saveBtn = page.getByRole('button', { name: 'Uložit hodnocení' });
  await expect(saveBtn).toBeVisible();
  await expect(saveBtn).not.toBeDisabled();

  // Save — expect navigation back to /today
  await saveBtn.click();
  await expect(page).toHaveURL('/today');
});

test('skin date param: observation and photo persisted with explicit ?date=', async ({ page }) => {
  await completeOnboarding(page);
  const pastDate = '2025-01-15';
  await page.goto(`/skin?date=${pastDate}`);

  await page.getByRole('button', { name: 'Zlepšení' }).click();
  await uploadPhoto(page, 'old.jpg');
  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();
  await expect(page).toHaveURL('/today');

  const result = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const obs = await db.skin_observations.toArray();
    const photos = await db.photos.toArray();
    return {
      obsDate: obs[0]?.date,
      photoDate: photos[0]?.date,
    };
  });

  expect(result.obsDate).toBe(pastDate);
  expect(result.photoDate).toBe(pastDate);
});

test('skin save: notes text persists trimmed in IndexedDB', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await page.getByRole('button', { name: 'Beze změny' }).click();
  await page.getByPlaceholder('Poznámka (volitelné) — např. zarudnutí na tváři…').fill('  zarudnutí na tváři  ');
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();
  await expect(page).toHaveURL('/today');

  const notes = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const rows = await db.skin_observations.toArray();
    return rows[0]?.notes;
  });

  expect(notes).toBe('zarudnutí na tváři');
});

test('skin save: whitespace-only notes persisted as undefined', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await page.getByRole('button', { name: 'Beze změny' }).click();
  await page.getByPlaceholder('Poznámka (volitelné) — např. zarudnutí na tváři…').fill('   ');
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();
  await expect(page).toHaveURL('/today');

  const notes = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const rows = await db.skin_observations.toArray();
    return rows[0]?.notes;
  });

  expect(notes).toBeUndefined();
});

test('skin save: observation persists to IndexedDB with correct shape', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await page.goto('/skin');

  await page.getByRole('button', { name: 'Zhoršení' }).click();
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();
  await expect(page).toHaveURL('/today');

  const record = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const rows = await db.skin_observations.toArray();
    if (rows.length !== 1) return null;
    const r = rows[0];
    return { id: r.id, date: r.date, createdAt: r.createdAt, status: r.status, notes: r.notes };
  });

  expect(record).not.toBeNull();
  expect(record!.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(record!.date).toBe(today);
  expect(record!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  expect(record!.status).toBe('worsened');
  expect(record!.notes).toBeUndefined();
});

test('skin returnTo: save navigates to custom returnTo param', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  await page.goto('/skin?returnTo=/program');
  await page.getByRole('button', { name: 'Zhoršení' }).click();
  await page.getByRole('button', { name: 'Uložit hodnocení' }).click();

  await expect(page).toHaveURL('/program');
});

test('skin back chevron: navigates to returnTo without saving', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  await page.goto('/skin?returnTo=/today');
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();

  // Back without selecting anything
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL('/today');
});

test('skin back chevron: does not persist observation when status was selected', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin?returnTo=/today');

  await page.getByRole('button', { name: 'Zlepšení' }).click();
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL('/today');

  const count = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    return db.skin_observations.count();
  });
  expect(count).toBe(0);
});

test('skin: bottom nav is hidden on /skin route', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Confirm nav is visible on /today
  await expect(page.getByRole('navigation')).toBeVisible();

  await page.goto('/skin');
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();

  // Nav must be hidden
  await expect(page.getByRole('navigation')).not.toBeVisible();
});

test('skin reintro pill: visible when active reintroduction phase', async ({ page }) => {
  await seedReintroductionSchedule(page);
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Dnes' })).toBeVisible();

  await page.goto('/skin');
  await expect(page.getByText('🔬 Sledujte reakci na 🥛 Mléčné výrobky')).toBeVisible();
});

test('skin photo: "Přidat fotku" button visible before status selection', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();

  // Photo button always present, no status needed
  await expect(page.getByText('Přidat fotku')).toBeVisible();

  // Save button still absent (no status yet)
  await expect(page.getByRole('button', { name: 'Uložit hodnocení' })).not.toBeVisible();
});

async function uploadPhoto(page: Page, fileName: string, mimeType = 'image/jpeg') {
  // waitFor ensures the input is in the DOM before evaluate runs (fixes race in tests
  // that don't have an explicit page-ready assertion before calling uploadPhoto).
  await page.locator('input[type="file"][accept="image/*"]').waitFor({ state: 'attached' });
  // setInputFiles does not reliably fire `change` on inputs with capture="environment"
  // in Chromium. Manually set files via DataTransfer and dispatch the event instead.
  await page.evaluate(
    ({ name, mime, data }) => {
      const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement | null;
      if (!input) throw new Error('photo input not found');
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const file = new File([bytes], name, { type: mime });
      const dt = new DataTransfer();
      dt.items.add(file);
      Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { name: fileName, mime: mimeType, data: btoa('fake-image') },
  );
}

test('skin photo: capturing a file updates button label to "Fotka pořízena (1)"', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');
  await expect(page.getByText('Přidat fotku')).toBeVisible();

  await uploadPhoto(page, 'skin.jpg');

  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();
});

test('skin photo: two captures produce distinct records with matching date', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await page.goto('/skin');

  await uploadPhoto(page, 'a.jpg');
  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();
  await uploadPhoto(page, 'b.jpg');
  await expect(page.getByText('Fotka pořízena (2)')).toBeVisible();

  const records = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const photos = await db.photos.toArray();
    return photos.map(p => ({ id: p.id, date: p.date, blobSize: p.blob?.size ?? 0 }));
  });

  expect(records).toHaveLength(2);
  expect(records[0].id).not.toBe(records[1].id);
  expect(records[0].date).toBe(today);
  expect(records[1].date).toBe(today);
  expect(records[0].blobSize).toBeGreaterThan(0);
  expect(records[1].blobSize).toBeGreaterThan(0);
});

test('skin photo: two captures increment counter to (2)', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/skin');

  await uploadPhoto(page, 'a.jpg');
  // Wait for Svelte to update the counter text before triggering second capture
  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();

  await uploadPhoto(page, 'b.jpg');
  await expect(page.getByText('Fotka pořízena (2)')).toBeVisible();
});

test('skin photo: captured photo persists in IndexedDB after capture', async ({ page }) => {
  await completeOnboarding(page);
  const today = new Date().toISOString().split('T')[0];
  await page.goto('/skin');

  await uploadPhoto(page, 'skin.jpg');
  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();

  const record = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    const photos = await db.photos.toArray();
    if (photos.length !== 1) return null;
    const p = photos[0];
    return {
      id: p.id,
      date: p.date,
      capturedAt: p.capturedAt,
      blobSize: p.blob?.size ?? 0,
    };
  });

  expect(record).not.toBeNull();
  expect(record!.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  expect(record!.date).toBe(today);
  expect(record!.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO datetime
  expect(record!.blobSize).toBeGreaterThan(0);
});
