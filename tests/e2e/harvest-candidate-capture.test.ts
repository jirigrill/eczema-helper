import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── DB helpers ────────────────────────────────────────────────────────────────

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.meals.clear();
    await db.harvest_candidates.clear();
    db.close();
  });
}

async function countCandidates(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return db.harvest_candidates.count();
  });
}

// Poll the DB until harvest_candidates reaches `expected` count (handles async fire-and-forget write).
async function waitForCandidateCount(page: Page, expected: number): Promise<void> {
  await page.waitForFunction(
    async (n: number) => {
      const path = '/src/lib/db/atopic-db.ts';
      const { db } = await import(/* @vite-ignore */ path);
      return (await db.harvest_candidates.count()) === n;
    },
    expected,
    { timeout: 5000 },
  );
}

async function readCandidate(page: Page, normalizedKey: string) {
  return page.evaluate(async (key) => {
    const path = '/src/lib/db/atopic-db.ts';
    const { db } = await import(/* @vite-ignore */ path);
    return db.harvest_candidates.get(key);
  }, normalizedKey);
}

async function completeOnboarding(page: Page) {
  const today = new Date().toISOString().split('T')[0];
  await expect(page.getByRole('button', { name: 'Začít' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít' }).click();
  await page.fill('#birthdate', '2025-01-01');
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Pokračovat' }).click();
  await page.getByRole('button', { name: 'Potvrdit a spustit program' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
}

// ─────────────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
  await page.reload({ waitUntil: 'networkidle' });
});

// ── Unknown food creates candidate ────────────────────────────────────────────

test('unknown free-text food creates exactly one harvest candidate', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await page.fill('input[placeholder="Název potraviny…"]', 'Kokos');
  await page.getByRole('button', { name: 'Přidat' }).click();
  // Wait for basket item to confirm sync path completed, then wait for async DB write.
  await expect(page.getByTestId('basket-item')).toBeVisible();
  await waitForCandidateCount(page, 1);

  const candidate = await readCandidate(page, 'kokos');
  expect(candidate).not.toBeNull();
  expect(candidate.count).toBe(1);
  expect(candidate.rawForms).toContain('Kokos');
  expect(candidate.status).toBe('pending');
});

test('adding the same unknown food twice bumps count but creates only one candidate', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  await page.fill('input[placeholder="Název potraviny…"]', 'Kokos');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByTestId('basket-item')).toBeVisible();
  await waitForCandidateCount(page, 1);

  await page.fill('input[placeholder="Název potraviny…"]', 'kokos');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByTestId('basket-item')).toHaveCount(2);
  await waitForCandidateCount(page, 1);

  const candidate = await readCandidate(page, 'kokos');
  expect(candidate.count).toBe(2);
  expect(candidate.rawForms).toContain('Kokos');
  expect(candidate.rawForms).toContain('kokos');
});

// ── Known food creates NO candidate ──────────────────────────────────────────

test('known allergen entered via free-text input creates no harvest candidate', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // 'pšenice' is an alias for the canonical 'wheat' allergen
  await page.fill('input[placeholder="Název potraviny…"]', 'pšenice');
  await page.getByRole('button', { name: 'Přidat' }).click();
  // Wait for basket item to confirm the click was processed.
  await expect(page.getByTestId('basket-item')).toBeVisible();

  expect(await countCandidates(page)).toBe(0);
});

test('mixed session: unknown food captured, known food not captured', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/meal');
  await expect(page.getByText('Přidat jídlo')).toBeVisible();

  // Known allergen — should NOT create candidate
  await page.fill('input[placeholder="Název potraviny…"]', 'vejce');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByTestId('basket-item')).toBeVisible();

  // Unknown food — SHOULD create candidate
  await page.fill('input[placeholder="Název potraviny…"]', 'Kokos');
  await page.getByRole('button', { name: 'Přidat' }).click();
  await expect(page.getByTestId('basket-item')).toHaveCount(2);
  await waitForCandidateCount(page, 1);

  const candidate = await readCandidate(page, 'kokos');
  expect(candidate).not.toBeNull();
});
