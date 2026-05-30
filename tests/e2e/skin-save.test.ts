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

test('skin save: select status, hit Uložit, navigates to /today', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  await page.goto('/skin?returnTo=/today');
  await expect(page.getByText('Záznam stavu kůže')).toBeVisible();

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
  await expect(page.getByText(/Sledujte reakci na/)).toBeVisible();
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
  await page.goto('/skin');

  await uploadPhoto(page, 'skin.jpg');
  await expect(page.getByText('Fotka pořízena (1)')).toBeVisible();

  // Verify Blob was actually persisted to IndexedDB
  const count = await page.evaluate(async () => {
    const { db } = await import(/* @vite-ignore */ '/src/lib/db/atopic-db.ts');
    return db.photos.count();
  });
  expect(count).toBe(1);
});
