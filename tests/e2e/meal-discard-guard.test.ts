import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clearDb(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/db/atopic-db.ts';
    const { AtopicDb } = await import(/* @vite-ignore */ path);
    const db = new AtopicDb();
    await db.answers.clear();
    await db.schedule.clear();
    await db.settings.clear();
    db.close();
  });
}

async function completeOnboarding(page: Page) {
  // Seed the post-onboarding state directly into IndexedDB instead of clicking
  // through the wizard — equivalent result (reset phase from today, no tested
  // allergens), far faster. The onboarding flow itself is covered by the
  // onboarding-summary + questionnaire-* tests.
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
  await page.goto(`/day/${today}`);
  await page.waitForURL(/\/day\//);
}

async function addBramboraAndCommit(page: Page) {
  await page.getByRole('button', { name: /Zelenina/ }).click();
  await page.getByRole('button', { name: 'Brambory', exact: true }).click();
  await page.getByRole('button', { name: /Uložit Brambory/ }).click();
  await page.getByRole('button', { name: /Uložit Zelenina/ }).click();
  // Committing the family runs its own `history.back()` to unwind the drill-in's
  // shallow-routed entry. Wait until that has settled on the grid (the finalize
  // CTA reappears, drilledFamily is null) before the caller issues any further
  // history navigation — otherwise a racing double-back makes `beforeNavigate`
  // see a stale drilledFamily and skip writing the discard buffer.
  await expect(page.getByRole('button', { name: /Uložit Oběd/ })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDb(page);
});

// ── Discard guard: empty working list ─────────────────────────────────────────

test('discard guard: back with empty working list navigates immediately, no toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo neuloženo')).not.toBeVisible();
});

// ── Discard guard: non-empty working list ─────────────────────────────────────

test('discard guard: back with non-empty working list discards and shows toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);

  // Back arrow — should discard and navigate to /day/<today>
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  // Toast must appear on the destination screen (rendered by layout)
  await expect(page.getByText('Jídlo neuloženo')).toBeVisible();
});

// ── Discard undo: Zpět restores working list ──────────────────────────────────

test('discard guard: tapping Zpět on toast restores the working list', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  await page.goto(`/meal?type=lunch&returnTo=/day/${today}`);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);

  // Back — discard
  await page.getByRole('button', { name: '‹' }).click();
  await expect(page).toHaveURL(`/day/${today}`);
  await expect(page.getByText('Jídlo neuloženo')).toBeVisible();

  // Tap "Zpět" on the toast
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);

  // The restored working list should contain the original food
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

// ── Popstate (browser/Android back) — issue #262 ─────────────────────────────
//
// The arrow `‹` is a click handler; a system back gesture / browser back button
// fires `popstate` and bypasses click handlers entirely. The discard guard must
// fire on every exit-path that would lose a non-empty working list, regardless
// of trigger. Tests below drive `history.back()` in-page to simulate popstate
// without a literal touch swipe (gesture simulation is awkward and unnecessary
// — the popstate event is what the guard listens for).

test('popstate: leaving grid with non-empty working list discards, lands on returnTo, shows toast, and Zpět restores', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Reach /meal via the in-app FAB so the previous history entry is part of
  // the same document — `history.back()` then fires a SvelteKit popstate
  // (not a full page reload). A fresh `page.goto('/meal?...')` would create
  // a brand-new document and back-out would be `'leave'`, not `'popstate'`.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByRole('button', { name: 'Přidat jídlo' }).click();
  await page.getByRole('button', { name: 'Oběd', exact: true }).click();
  await expect(page).toHaveURL(/\/meal\?type=lunch/);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  await addBramboraAndCommit(page);

  // Simulate Android system back / browser back button.
  await page.evaluate(() => history.back());

  // Same destination as the arrow path.
  await expect(page).toHaveURL(`/day/${today}`);
  // Layout-level undo toast appears — this is the externally observable evidence
  // that writeBuffer fired (the toast renders iff discardBuffer is set).
  await expect(page.getByText('Jídlo neuloženo')).toBeVisible();

  // Tap Zpět to restore the working list.
  await page.getByRole('button', { name: 'Zpět' }).click();
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByText('Přidané potraviny')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
});

test('popstate: leaving grid with empty working list navigates immediately, no toast', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  // Same SPA-internal entry pattern as the non-empty test.
  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByRole('button', { name: 'Přidat jídlo' }).click();
  await page.getByRole('button', { name: 'Oběd', exact: true }).click();
  await expect(page).toHaveURL(/\/meal\?type=lunch/);
  await expect(page.getByRole('heading', { name: 'Oběd' })).toBeVisible();

  // No food added — working list is empty.
  await page.evaluate(() => history.back());

  await expect(page).toHaveURL(`/day/${today}`);
  // No discard happened, so the layout toast must NOT appear.
  await expect(page.getByText('Jídlo neuloženo')).not.toBeVisible();
});

test('popstate: from inside a drill-in pops to the grid (does not leave /meal), working list preserved', async ({ page }) => {
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Přidat záznam' }).click();
  await page.getByRole('button', { name: 'Přidat jídlo' }).click();
  await page.getByRole('button', { name: 'Oběd', exact: true }).click();
  await expect(page).toHaveURL(/\/meal\?type=lunch/);

  // Commit a food first so we can verify the working list survives the
  // drill-in popstate (vs. leaks into a discard buffer).
  await addBramboraAndCommit(page);
  // Re-enter a drill-in.
  await page.getByRole('button', { name: /Mléko/ }).click();
  // Drill-in shows the family heading, not the grid label.
  await expect(page.getByRole('heading', { name: /Mléko/ })).toBeVisible();

  // Android system back from drill-in.
  await page.evaluate(() => history.back());

  // Still on /meal — drill-in popped to grid.
  await expect(page).toHaveURL(/\/meal/);
  await expect(page.getByText('Všechny kategorie')).toBeVisible();
  // Working list intact.
  await expect(page.getByRole('button', { name: 'Brambory', exact: true })).toBeVisible();
  // No discard buffer / toast.
  await expect(page.getByText('Jídlo neuloženo')).not.toBeVisible();
});

// ── AC4: arrow and popstate are equivalent (same destination, same captured
// working meal). The earlier arrow + popstate tests each assert URL + toast in
// isolation; this one runs BOTH paths from an identical starting state and
// asserts they produce the same observable outcome — same returnTo, the discard
// toast, and an undo that restores the same working list. We probe via those
// externally-observable signals (the same ones the sibling tests trust) rather
// than reaching into the discardBuffer module from page.evaluate, which is
// brittle across the dev server's module graph.
test('arrow and popstate produce equivalent discard outcomes and land on the same returnTo', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await completeOnboarding(page);

  async function leaveAndProbe(viaPopstate: boolean): Promise<{ url: string; restored: boolean }> {
    // Hard-reload between iterations to reset BOTH window.history and the
    // in-memory discardBuffer store. The drill-in is shallow-routed via
    // `pushState`; without a clean history per pass, entries accumulated by the
    // first iteration cause the second drill-in to immediately pop back to the
    // grid (the food row never appears). A full document load gives each pass a
    // single-entry history and a fresh store.
    await page.goto(`/day/${today}`);
    await page.waitForURL(/\/day\//);

    await page.getByRole('button', { name: 'Přidat záznam' }).click();
    await page.getByRole('button', { name: 'Přidat jídlo' }).click();
    await page.getByRole('button', { name: 'Oběd', exact: true }).click();
    await expect(page).toHaveURL(/\/meal\?type=lunch/);
    await addBramboraAndCommit(page);

    if (viaPopstate) {
      await page.evaluate(() => history.back());
    } else {
      await page.getByRole('button', { name: '‹' }).click();
    }
    await expect(page).toHaveURL(`/day/${today}`);
    const url = page.url();

    // Buffer was written ⇒ the layout discard toast is visible (compose-new).
    await expect(page.getByText('Jídlo neuloženo')).toBeVisible();

    // Undo restores the SAME working list — proves the buffer carried Brambory,
    // not just that *a* toast appeared.
    await page.getByRole('button', { name: 'Zpět' }).click();
    await expect(page).toHaveURL(/\/meal/);
    const restored = await page
      .getByRole('button', { name: 'Brambory', exact: true })
      .isVisible();

    return { url, restored };
  }

  const arrow = await leaveAndProbe(false);
  const popstate = await leaveAndProbe(true);

  // Same destination, and both paths wrote a buffer whose undo restored the food.
  expect(arrow.url).toMatch(new RegExp(`/day/${today}$`));
  expect(popstate.url).toBe(arrow.url);
  expect(arrow.restored).toBe(true);
  expect(popstate.restored).toBe(true);
});
