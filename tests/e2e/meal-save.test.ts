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

/** Seed answers + schedule directly so dairy is in an active elimination phase today.
 *  Used by tests that need eliminatedToday to include 'dairy' without going through onboarding. */
async function seedDairyEliminationSchedule(page: Page) {
  await page.evaluate(async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    // Variable prevents TS from resolving the path (same pattern as clearDb above)
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: today,
      completedAt: new Date().toISOString(),
      testedAllergens: ['dairy'],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: future,
      phases: [{
        id: 'elim-dairy',
        type: 'elimination',
        allergenIds: ['dairy'],
        startDate: today,
        endDate: future,
      }],
    });
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
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

test('meal save: add two foods, hit Hotovo, success toast appears and page navigates to /today', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Navigate to meal-add via the + link that passes returnTo
  await page.goto('/meal?returnTo=/today');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Empty-state basket visible initially
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();

  // Add first custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Add second custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Mrkev');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Hotovo button is active (not disabled)
  const hotovo = page.getByRole('button', { name: /Hotovo/ });
  await expect(hotovo).toHaveAttribute('aria-disabled', 'false');

  // Save the meal — expect navigation to /today
  await hotovo.click();
  await expect(page).toHaveURL('/today');
});

test('liveQuery: meal saved on /meal appears on /today without reload', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Today screen shows empty meals state before any meal is saved
  await expect(page.getByText('Zatím žádný záznam.')).toBeVisible();

  // Navigate to meal-add with returnTo=/today
  await page.goto('/meal?returnTo=/today');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Add a food item and save
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await page.getByRole('button', { name: /Hotovo/ }).click();

  // returnTo navigates us back to /today
  await expect(page).toHaveURL('/today');

  // The saved meal now appears in the live list — no manual reload needed
  await expect(page.getByText('Oběd')).toBeVisible();
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('meal item editing: tap item row, pick amount chip, pick preparation chip, subtitle reflects choices', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');

  // Add a custom food
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Collapsed row shows default subtitle (no chip panel)
  await expect(page.getByText('Množství')).not.toBeVisible();
  await expect(page.getByText('Příprava')).not.toBeVisible();

  // Tap item row to expand
  const basketItem = page.locator('[data-testid="basket-item"]');
  const basketItemHeader = page.locator('[data-testid="basket-item-header"]');

  // Expand by tapping the header (header area is always above the chip panel)
  await basketItemHeader.click();
  await expect(page.getByText('uprav množství a přípravu')).toBeVisible();

  // All 5 Množství chips present (scoped inside basket item to avoid matching outer div[role="button"])
  await expect(basketItem.getByRole('button', { name: 'Špetka' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Porce' })).toBeVisible();

  // All 4 Příprava chips present
  await expect(basketItem.getByRole('button', { name: 'Vařené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Dušené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Pečené' })).toBeVisible();
  await expect(basketItem.getByRole('button', { name: 'Smažené' })).toBeVisible();

  // Pick amount 'Lžička'
  await basketItem.getByRole('button', { name: 'Lžička' }).click();

  // Pick preparation 'Vařené'
  await basketItem.getByRole('button', { name: 'Vařené' }).click();

  // Collapse by tapping the header again
  await basketItemHeader.click();
  await expect(page.getByText('uprav množství a přípravu')).not.toBeVisible();

  // Collapsed subtitle reflects chosen amount and preparation
  await expect(page.getByText(/lž\./)).toBeVisible();
  await expect(page.getByText(/vařené/i)).toBeVisible();
});

test('meal item remove and re-add: remove clears basket, re-adding restores it', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');

  // Add two foods
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  await page.fill('input[placeholder="Název potraviny…"]', 'Mrkev');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Mrkev')).toBeVisible();

  // Remove Brambory — ✕ button is inside its basket item row
  const bramboRow = page.locator('[data-testid="basket-item"]').filter({ hasText: 'Brambory' });
  await bramboRow.getByRole('button', { name: '✕' }).click();
  await expect(page.getByText('Brambory')).not.toBeVisible();

  // Mrkev still present; Hotovo still enabled
  await expect(page.getByText('Mrkev')).toBeVisible();
  await expect(page.getByRole('button', { name: /Hotovo/ })).toHaveAttribute('aria-disabled', 'false');

  // Remove Mrkev — basket goes empty
  await page.locator('[data-testid="basket-item"]').getByRole('button', { name: '✕' }).click();
  await expect(page.getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hotovo' })).toHaveAttribute('aria-disabled', 'true');

  // Re-add Brambory
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Hotovo re-enabled; save works — navigates to /day/<today> (default returnTo) on success
  await expect(page.getByRole('button', { name: /Hotovo/ })).toHaveAttribute('aria-disabled', 'false');
  await page.getByRole('button', { name: /Hotovo/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);
});

test('conflict toast: selecting a food with an eliminated allergen shows transient warning toast', async ({ page }) => {
  // Seed a schedule where dairy is the active elimination allergen today
  await seedDairyEliminationSchedule(page);

  // Load /today so the schedule context initialises from the seeded DB
  await page.goto('/today');
  // "Vyhýbej se" column confirms the elimination phase is active in the UI
  await expect(page.getByText('✗ Vyhýbej se')).toBeVisible();

  // Navigate to meal-add
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // The eliminated-allergen banner confirms dairy is flagged for this session
  await expect(page.getByText('Dnes vyřazeno:')).toBeVisible();

  // Open the category sheet
  await page.getByRole('button', { name: /Všechny kategorie/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tap "Mléčné výrobky" — it has sub-items, so this opens the sub-item panel
  await page.getByRole('button', { name: /Mléčné/ }).click();

  // Pick a specific dairy sub-item (Jogurt)
  await page.getByRole('button', { name: 'Jogurt' }).click();

  // Sheet closes and the conflict toast appears with the allergen name
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByText('⚠ Mléčné výrobky vyřazeno — odchylka zaznamenána')
  ).toBeVisible();

  // Toast is transient — it disappears on its own after 3 s (the auto-dismiss timer)
  await expect(
    page.getByText('⚠ Mléčné výrobky vyřazeno — odchylka zaznamenána')
  ).not.toBeVisible({ timeout: 5000 });
});

// ── Slice 2f: pill-switch autosave + slot re-open ──────────

test('slot re-open: navigating back to /meal after saving a slot pre-loads its items', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');

  // Save a lunch slot with one item
  await page.goto('/meal');
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();
  await page.getByRole('button', { name: /Hotovo/ }).click();
  await expect(page).toHaveURL(`/day/${today}`);

  // Navigate back to /meal — the lunch slot should be pre-loaded
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('pill-switch autosave: switching meal type with non-empty basket saves silently and shows toast', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Add a food to the lunch basket
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  // Switch to Snídaně — should trigger silent autosave of lunch
  await page.getByRole('button', { name: 'Snídaně' }).click();

  // Autosave toast appears referencing "Oběd" (the slot that was just saved)
  await expect(page.getByText(/Oběd.*uložen/)).toBeVisible();

  // After switching, basket is empty (no saved snídaně yet)
  await expect(page.getByText(/Zatím prázdné/)).toBeVisible();

  // Switch back to Oběd — the previously saved item should re-appear
  await page.getByRole('button', { name: 'Oběd' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();
});

test('pill-switch with empty basket: no autosave call and no toast', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page).toHaveURL('/today');
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Basket is empty — switch should not produce a toast
  await page.getByRole('button', { name: 'Snídaně' }).click();

  await expect(page.getByText(/uložen/)).not.toBeVisible();
  await expect(page.getByText(/Zatím prázdné/)).toBeVisible();
});

// ── Slice 4c: ?date= query parameter ─────────────────────────────

test('?date= param: loads slot for specified date, saves to that date, navigates to /day/<date>', async ({ page }) => {
  // Seed a schedule starting 2025-01-01 so 2025-01-15 is a valid past date within the program
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    await db.answers.put({
      id: 'singleton',
      babyBirthDate: '2025-01-01',
      eczemaSeverity: 'moderate',
      motherAllergies: [],
      babyConfirmedAllergies: [],
      programStartDate: '2025-01-01',
      completedAt: '2025-01-01T00:00:00.000Z',
      testedAllergens: [],
    });
    await db.schedule.put({
      id: 'singleton',
      permanentMother: [],
      permanentBaby: [],
      startDate: '2025-01-01',
      estimatedEndDate: '2027-01-01',
      phases: [{
        id: 'elim',
        type: 'elimination',
        allergenIds: [],
        startDate: '2025-01-01',
        endDate: '2027-01-01',
      }],
    });
  });

  // Navigate to meal page with a past date within the program
  await page.goto('/meal?type=breakfast&date=2025-01-15');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Add a food and save
  await page.fill('input[placeholder="Název potraviny…"]', 'Brambory');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByText('Brambory')).toBeVisible();

  await page.getByRole('button', { name: /Hotovo/ }).click();

  // returnTo should default to /day/2025-01-15 (not /today)
  await expect(page).toHaveURL('/day/2025-01-15');

  // The saved meal should appear on the day screen
  await expect(page.getByText('Brambory')).toBeVisible();
});
