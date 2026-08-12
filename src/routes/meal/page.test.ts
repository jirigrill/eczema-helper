import { tick } from 'svelte';
import { writable } from 'svelte/store';

import * as navigation from '$app/navigation';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '$lib/db/atopic-db';
import type { Meal } from '$lib/domain/models';
import { clearBuffer, writeBuffer } from '$lib/stores/discard-buffer';
import { mealSession } from '$lib/stores/meal-session';

type FeedingStage = 'breastfed' | 'mixed' | 'solids';

let mockFeedingStage: FeedingStage = 'breastfed';
vi.mock('$lib/stores/settings.svelte', () => ({
  settingsStore: {
    get feedingStage() {
      return mockFeedingStage;
    },
  },
}));
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  beforeNavigate: vi.fn(),
  pushState: vi.fn((_url: string, state: Record<string, unknown>) => {
    mockPage.state = state;
  }),
}));

const mockDiscardBuffer = writable<null>(null);
vi.mock('$lib/stores/discard-buffer', () => ({
  get discardBuffer() {
    return mockDiscardBuffer;
  },
  writeBuffer: vi.fn(),
  clearBuffer: vi.fn(),
}));

const meals = mealSession;

const mockPage: { url: URL; state: Record<string, unknown> } = {
  url: new URL('http://localhost/meal'),
  state: {},
};
vi.mock('$app/state', () => ({ page: mockPage }));

const today = new Date().toISOString().split('T')[0]!;
const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]!;

beforeEach(async () => {
  // Reset the feeding stage to the default so a test that changes it (and may
  // fail before its own cleanup line) can't leak the stage into the next test.
  mockFeedingStage = 'breastfed';
  await db.meals.clear();
  await db.skin_observations.clear();
  mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  mockPage.state = {};
  mockDiscardBuffer.set(null);
});

describe('meal/+page.svelte', () => {
  // ── Layout: NO meal type pills (type is fixed at entry, ADR-0018) ────────

  it('does NOT render meal type pills — type is bound to the URL', async () => {
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    // No standalone Snídaně/Oběd/Svačina/Večeře pill buttons (CTA may include them).
    const pillCandidates = ['Snídaně', 'Oběd', 'Svačina', 'Večeře'].map((name) =>
      queryByRole('button', { name }),
    );
    expect(pillCandidates.every((b) => b === null)).toBe(true);
  });

  // ── Actor picker (issue #569, spec #564) ───────────────────
  // In `mixed` the mother chooses whose meal she's logging; in
  // `breastfed`/`solids` a single actor is implicit — no picker.

  it('renders the Já / Miminko actor pills in the mixed feeding stage', async () => {
    mockFeedingStage = 'mixed';
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    expect(getByRole('button', { name: 'Já' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Miminko' })).toBeInTheDocument();
    mockFeedingStage = 'breastfed';
  });

  it('renders NO actor picker in the breastfed feeding stage', async () => {
    mockFeedingStage = 'breastfed';
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: 'Já' })).toBeNull();
    expect(queryByRole('button', { name: 'Miminko' })).toBeNull();
  });

  it('renders NO actor picker in the solids feeding stage', async () => {
    mockFeedingStage = 'solids';
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: 'Já' })).toBeNull();
    expect(queryByRole('button', { name: 'Miminko' })).toBeNull();
    mockFeedingStage = 'breastfed';
  });

  // ── Layout: family grid ───────────────────────────────────

  it('renders "Všechny kategorie" label and family grid on initial load', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText('Všechny kategorie')).toBeInTheDocument();
  });

  // ── No custom-food entry path (issue #662) ────────────────
  // Custom food is removed: the catalog is the whole set of loggable foods.
  // These are the guards that stop the capability returning by accident. They
  // assert the user's reality — "there is no way to type a food" — at the
  // highest seam where that is assertable without a browser.

  it('the family grid offers no Vlastní tile', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: /Vlastní/ })).toBeNull();
  });

  it('the grid screen has no free-text food input', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { container } = render(MealPage);
    await tick();
    // The meal-notes textarea is legitimate; a text/search `input` is not.
    expect(container.querySelectorAll('input[type="text"], input:not([type])')).toHaveLength(0);
  });

  it.each(['Mléko', 'Ovoce', 'Nápoje a čaje'])(
    'the %s drill-in has no free-text food input',
    async (familyName) => {
      const { default: MealPage } = await import('./+page.svelte');
      const { getByRole, container } = render(MealPage);
      await tick();
      await fireEvent.click(getByRole('button', { name: new RegExp(familyName) }));
      await tick();
      expect(container.querySelectorAll('input[type="text"], input:not([type])')).toHaveLength(0);
    },
  );

  // ── Drill-in navigation ───────────────────────────────────

  it('tapping a family tile shows the drill-in: header title changes to family name', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    // Grid-state header: meal-type label only (issue #278) — URL is ?type=lunch.
    expect(queryByText('Oběd')).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Oběd')).not.toBeInTheDocument();
    expect(queryByText('🥛 Mléko')).toBeInTheDocument();
  });

  it('back chevron (‹) in drill-in returns to family grid', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getByText, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(queryByText('Oběd')).toBeInTheDocument();
    expect(getByText('Všechny kategorie')).toBeInTheDocument();
  });

  it('drill-in has NO "Procházet rodiny" link', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Procházet rodiny')).not.toBeInTheDocument();
  });

  // ── Tapping a food starts editing ────────────────────────

  it('tapping a food in drill-in puts it in editing (shows Množství + Příprava)', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText, getByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Množství')).not.toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    expect(getByText('Množství')).toBeInTheDocument();
    expect(getByText('Příprava')).toBeInTheDocument();
  });

  it('only one food can be editing at a time', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getAllByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Jogurt' })); // disabled, but click should be no-op
    await tick();
    const amounts = getAllByText('Množství');
    expect(amounts).toHaveLength(1);
  });

  // ── CTA label + confirm/cancel food flow ────────────────────
  // The `Uložit {Food}` / `Uložit {Family}` / `Uložit {MealType}` label
  // transitions, the confirm-collapses-editor flow, sibling locked-confirmed /
  // locked-idle states, and cancel-by-re-tap are all covered end-to-end by
  // `tests/e2e/meal-modal-edit.test.ts` (42 tests, real Dexie, real routing).
  //
  // Route-only invariant kept below: the disabled bare "Uložit" state on an
  // empty compose-new grid. `meal-modal-edit` seeds foods first, so this
  // pre-food render is unique to the route test.

  it('CTA reads "Uložit" on grid with no confirmed foods', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Compose-new + empty list: the CTA simplifies to bare "Uložit" (disabled).
    const cta = getByRole('button', { name: 'Uložit' });
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('aria-disabled')).toBe('true');
  });

  // ── Grid: confirmed-foods summary + notes ────────────────

  it('grid shows read-only confirmed foods summary after family commit', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Should see the food in a summary on the grid
    expect(getByText('Přidané potraviny')).toBeInTheDocument();
    expect(getByText('Kravské mléko')).toBeInTheDocument();
  });

  it('grid has a Poznámka textarea', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    expect(getByRole('textbox', { name: /Poznámka/ })).toBeInTheDocument();
  });

  // ── Schedule banners (preserved) ─────────────────────────

  // ── Grid working-list: tap-to-edit ───────────────────────
  // Row-tap opens the inline editor, ✕ removes the row, outside-click confirms
  // and re-tap opens a second row while confirming the first — all covered
  // end-to-end by `tests/e2e/meal-modal-edit.test.ts` (AC245-* group).

  it('CTA is primary when saving a family (family commit flow)', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Drill into Zelenina
    await fireEvent.click(getByRole('button', { name: /Zelenina/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Brambory/ }));
    await tick();
    // "Uložit Zelenina" — the finalize CTA is primary.
    const cta = getByRole('button', { name: /Uložit Zelenina/ });
    expect(cta.className).toContain('bg-primary');
  });

  it('opening a grid row editor does not remove sibling foods from the working list', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Commit two foods from different families
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Zelenina/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Zelenina/ }));
    await tick();
    // Both foods are in the working list
    expect(getByRole('button', { name: 'Kravské mléko' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Brambory' })).toBeInTheDocument();
    // Open editor on Kravské mléko
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    // Brambory must still be visible — it should NOT disappear
    expect(getByRole('button', { name: 'Brambory' })).toBeInTheDocument();
    // Kravské mléko must be before Brambory (added first)
    const foodTiles = document.querySelectorAll('[data-food-tile]');
    const names = [...foodTiles].map((el) => el.textContent?.trim() ?? '');
    const milkIdx = names.findIndex((n) => n.includes('Kravské mléko'));
    const potatoIdx = names.findIndex((n) => n.includes('Brambory'));
    expect(milkIdx).toBeLessThan(potatoIdx);
  });

  it('opening a grid row editor keeps the editing food in its original position, not appended at bottom', async () => {
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Commit Kravské mléko first, then Brambory
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Zelenina/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Zelenina/ }));
    await tick();
    // Capture order before editing
    const beforeTiles = [...document.querySelectorAll('[data-food-tile]')].map(
      (el) => el.textContent?.trim() ?? '',
    );
    // Open editor on Brambory (second item)
    await fireEvent.click(getByRole('button', { name: 'Brambory' }));
    await tick();
    // Capture order after — Brambory must stay at same index
    const afterTiles = [...document.querySelectorAll('[data-food-tile]')].map(
      (el) => el.textContent?.trim() ?? '',
    );
    const beforeBramborIdx = beforeTiles.findIndex((n) => n.includes('Brambory'));
    const afterBramborIdx = afterTiles.findIndex((n) => n.includes('Brambory'));
    expect(afterBramborIdx).toBe(beforeBramborIdx);
  });

  // ── Actor picker routes to the actor's slot (issue #569) ─────────────────
  // Selecting an actor pill re-opens the editor for `${date}:${mealType}:${actor}`,
  // so the meal is composed against — and saved to — that actor's own slot.
  // Both meals in a slot coexist under the composite key; switching pills swaps
  // which one hydrates.

  it('switching to Miminko hydrates the baby meal from its own slot', async () => {
    mockFeedingStage = 'mixed';
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, findByRole, queryByRole } = render(MealPage);
    // Lands on the mother slot → Brambory hydrated, not Rýže.
    await findByRole('button', { name: /^Brambory$/ });
    expect(queryByRole('button', { name: /^Rýže$/ })).toBeNull();
    // Tap Miminko → the baby slot hydrates: Rýže shows, Brambory gone.
    await fireEvent.click(getByRole('button', { name: 'Miminko' }));
    await findByRole('button', { name: /^Rýže$/ });
    expect(queryByRole('button', { name: /^Brambory$/ })).toBeNull();
    mockFeedingStage = 'breastfed';
  });

  it('shows the forward "Hotovo" CTA on the actor whose work a swap autosaved (issue #571)', async () => {
    mockFeedingStage = 'mixed';
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    // Both slots start empty; the mother composes a food, then round-trips.
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, findByRole, findByText, queryByText, queryByRole } = render(MealPage);
    // Compose + confirm a food for the mother so the departing slot has work
    // to autosave: drill into a family, tap the food, then commit food + family.
    await fireEvent.click(await findByRole('button', { name: /Mléko/ }));
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Swap to Miminko (autosaves the mother), then back to Já. The mother is now
    // a clean, saved edit whose work was just autosaved → forward "Hotovo" exit.
    await fireEvent.click(getByRole('button', { name: 'Miminko' }));
    // Wait for the swap to settle on the empty baby slot before swapping back.
    await waitFor(() =>
      expect(getByRole('button', { name: 'Miminko' }).getAttribute('data-active')).toBe('true'),
    );
    await waitFor(() => expect(queryByText('Kravské mléko')).toBeNull());
    await fireEvent.click(getByRole('button', { name: 'Já' }));
    await findByText('Kravské mléko');
    await waitFor(() => expect(queryByRole('button', { name: 'Hotovo' })).not.toBeNull());
    mockFeedingStage = 'breastfed';
  });

  it('keeps the disabled "Uložit změny" CTA after cycling actor tabs without editing (issue #587)', async () => {
    mockFeedingStage = 'mixed';
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    // Both actors already have saved meals — nothing to save on either.
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, findByRole } = render(MealPage);
    // Lands on Já: clean saved edit → disabled "Uložit změny".
    await findByRole('button', { name: /^Brambory$/ });
    const ctaBefore = getByRole('button', { name: 'Uložit změny' });
    expect(ctaBefore.getAttribute('aria-disabled')).toBe('true');
    // Cycle Miminko → back to Já, editing nothing.
    await fireEvent.click(getByRole('button', { name: 'Miminko' }));
    await findByRole('button', { name: /^Rýže$/ });
    await fireEvent.click(getByRole('button', { name: 'Já' }));
    await findByRole('button', { name: /^Brambory$/ });
    // Returning to the unchanged mother slot must show the same disabled
    // "Uložit změny", NOT an enabled "Hotovo".
    const ctaAfter = getByRole('button', { name: 'Uložit změny' });
    expect(ctaAfter.getAttribute('aria-disabled')).toBe('true');
    mockFeedingStage = 'breastfed';
  });

  it('deleting on the Miminko pill removes the baby slot, leaving the mother meal intact', async () => {
    mockFeedingStage = 'mixed';
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, findByRole } = render(MealPage);
    await findByRole('button', { name: /^Brambory$/ });
    await fireEvent.click(getByRole('button', { name: 'Miminko' }));
    await findByRole('button', { name: /^Rýže$/ });
    // Delete via the ⋯ overflow → action list → destructive confirm sheet.
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await fireEvent.click(getByRole('button', { name: 'Smazat jídlo' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Smazat jídlo' }));
    await tick();
    const babySlot = await meals.loadBySlot(today, 'lunch', 'baby');
    const motherSlot = await meals.loadBySlot(today, 'lunch', 'mother');
    expect(babySlot.ok && babySlot.data).toBeFalsy();
    expect(motherSlot.ok && motherSlot.data?.items[0]?.name).toBe('Brambory');
    mockFeedingStage = 'breastfed';
  });

  // ── Incoming ?actor= pre-selects the tapped actor (issue #584) ───────────
  // The day view carries the tapped actor into the meal editor via `?actor=`.
  // In the mixed stage both actors are eligible, so without this the editor
  // always seeds `mother`. Entering with `?actor=baby` must hydrate the baby's
  // slot directly, not the mother's.

  it('mixed stage: entering with ?actor=baby hydrates the baby meal', async () => {
    mockFeedingStage = 'mixed';
    mockPage.url = new URL(
      `http://localhost/meal?type=lunch&date=${today}&actor=baby&returnTo=/day/${today}`,
    );
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, queryByRole } = render(MealPage);
    // Lands on the baby slot → Rýže hydrated, not Brambory.
    await findByRole('button', { name: /^Rýže$/ });
    expect(queryByRole('button', { name: /^Brambory$/ })).toBeNull();
    mockFeedingStage = 'breastfed';
  });

  it('composes for the baby slot in the solids stage (implicit single actor)', async () => {
    mockFeedingStage = 'solids';
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    // No picker in solids; the baby's meal hydrates as the implicit actor.
    await findByRole('button', { name: /^Rýže$/ });
    mockFeedingStage = 'breastfed';
  });

  // ── Discard guard mechanics live in the MealEditor + e2e tests ───────────
  // `meal-editor.test.ts`; the browser popstate gate is covered by
  // `tests/e2e/meal-discard-guard.test.ts` and `meal-dirty-discard.test.ts`.

  // ── Initial load of the pre-selected slot (bug: foods missing on landing) ──

  function lunchWithBramboryMeal(): Meal {
    return {
      id: '2025-06-13:lunch:mother',
      date: '2025-06-13',
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    };
  }

  // Slot hydration is verified at the editor boundary in `meal-editor.test.ts`
  // (`open()` on a saved slot). Rendering tests below seed the same row into
  // Dexie so the route hydrates the existing meal for real.

  // ── Explicit delete + empty-Hotovo guard (issue #268) ─────

  it('does NOT render the ⋯ overflow when composing a brand-new meal (empty slot)', async () => {
    // beforeEach clears db.meals — empty slot.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    await tick();
    expect(queryByRole('button', { name: 'Více' })).not.toBeInTheDocument();
  });

  it('renders the ⋯ overflow when editing an existing meal', async () => {
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    expect(await findByRole('button', { name: 'Více' })).toBeInTheDocument();
  });

  it('tapping ⋯ opens the action list with "Smazat jídlo" + "Zrušit"', async () => {
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    expect(getByRole('button', { name: 'Smazat jídlo' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Zrušit' })).toBeInTheDocument();
  });

  it('tapping "Zrušit" in the action list closes it', async () => {
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, queryByRole } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Zrušit' }));
    await tick();
    expect(queryByRole('button', { name: 'Smazat jídlo' })).not.toBeInTheDocument();
  });

  // The remove-call / discard-buffer / navigate / failure-toast lifecycle
  // around `Smazat jídlo` is exercised by `meal-editor.test.ts`
  // (`discardDescriptor('delete')`) and the e2e spec
  // `tests/e2e/meal-lifecycle.test.ts` (happy-path delete + undo plus the
  // delete-failure toast test tagged #400).

  // ── Copy-meal entry point + destination picker (spec #599, issue #606) ──

  it('shows "Kopírovat jídlo" in the ⋯ action list when the source meal has ≥1 food', async () => {
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    expect(getByRole('button', { name: 'Kopírovat jídlo' })).toBeInTheDocument();
  });

  it('hides "Kopírovat jídlo" for a notes-only / zero-food meal (but still shows delete)', async () => {
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    // An existing meal with a note but no foods — nothing to copy.
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [],
      notes: 'jen poznámka',
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, queryByRole } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    expect(queryByRole('button', { name: 'Kopírovat jídlo' })).toBeNull();
    // Delete stays available exactly as today.
    expect(getByRole('button', { name: 'Smazat jídlo' })).toBeInTheDocument();
  });

  it('tapping "Kopírovat jídlo" opens the destination picker (day strip + "Kopírovat sem")', async () => {
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, getByTestId } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    expect(getByTestId('day-strip')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Kopírovat sem' })).toBeInTheDocument();
  });

  it('picker: no future day is rendered; today is selectable', async () => {
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, container } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    // The "Kopírovat sem" button targets the source day (today) and starts enabled.
    // §3e: the destination gate is gone, so the button carries no disabled state at all.
    expect(getByRole('button', { name: 'Kopírovat sem' })).not.toHaveAttribute('aria-disabled');
    // The strip ends at today: no future cell is ever rendered (§3b/§3e).
    await waitFor(() => {
      const futureCell = container.querySelector(
        `[data-testid="day-strip-cell"][data-date="${future}"]`,
      );
      expect(futureCell).toBeNull();
    });
  });

  it('picker: the strip spans back to the earliest logged day, and it is a selectable destination', async () => {
    // An earlier logged meal moves the earliest-logged floor back to that day.
    const earlier = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
    await meals.save({
      id: `${earlier}:lunch:mother`,
      date: earlier,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'e1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, container } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    // The earliest logged day is the strip's earliest cell; selecting it keeps
    // the pick button enabled — every rendered cell is a legal destination.
    let cell: Element | null = null;
    await waitFor(() => {
      cell = container.querySelector(`[data-testid="day-strip-cell"][data-date="${earlier}"]`);
      expect(cell).not.toBeNull();
    });
    await fireEvent.click(cell!);
    await tick();
    expect(getByRole('button', { name: 'Kopírovat sem' })).not.toHaveAttribute('aria-disabled');
  });

  it('confirm copy (success): persists the destination meal, navigates to the dest day, writes a meal-copy buffer', async () => {
    vi.mocked(writeBuffer).mockClear();
    vi.mocked(navigation.goto).mockClear();
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, getByTestId } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    // Source day is today; copy into today's DINNER slot (empty destination).
    await fireEvent.click(getByRole('button', { name: 'Kopírovat sem' }));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-dinner'));
    await waitFor(async () => {
      const dinner = await meals.loadBySlot(today, 'dinner', 'mother');
      expect(dinner.ok && dinner.data?.items[0]?.name).toBe('Brambory');
    });
    expect(vi.mocked(navigation.goto)).toHaveBeenCalledWith(`/day/${today}`);
    expect(vi.mocked(writeBuffer)).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'meal-copy',
        destinationSlot: { date: today, mealType: 'dinner', actor: 'mother' },
        destinationPreexisted: false,
      }),
    );
  });

  it('confirm copy (success): awaits navigation before writing the undo buffer so the toast lands on the destination day (US-25)', async () => {
    vi.mocked(writeBuffer).mockClear();
    vi.mocked(navigation.goto).mockClear();
    // Make goto resolve on a deferred promise so we can observe that the buffer
    // write (which drives the layout-level toast) is sequenced strictly AFTER
    // navigation settles, not fired synchronously before it.
    let resolveGoto: () => void = () => {};
    const gotoSettled = new Promise<void>((resolve) => {
      resolveGoto = resolve;
    });
    vi.mocked(navigation.goto).mockReturnValueOnce(gotoSettled);
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, getByTestId } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat sem' }));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-dinner'));
    // goto has been called and is still pending → the buffer must NOT be written yet.
    await waitFor(() => expect(vi.mocked(navigation.goto)).toHaveBeenCalledWith(`/day/${today}`));
    expect(vi.mocked(writeBuffer)).not.toHaveBeenCalled();
    // Let navigation settle → the buffer (and thus the toast) is written now.
    resolveGoto();
    await waitFor(() =>
      expect(vi.mocked(writeBuffer)).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'meal-copy' }),
      ),
    );
  });

  it('confirm copy (no-op): copying onto its own slot writes nothing, navigates nowhere', async () => {
    vi.mocked(writeBuffer).mockClear();
    vi.mocked(navigation.goto).mockClear();
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, getByTestId } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    // Copy the lunch meal onto its OWN slot (today, lunch) → full overlap no-op.
    await fireEvent.click(getByRole('button', { name: 'Kopírovat sem' }));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-lunch'));
    await tick();
    expect(vi.mocked(writeBuffer)).not.toHaveBeenCalled();
    expect(vi.mocked(navigation.goto)).not.toHaveBeenCalled();
  });

  it('confirm copy (save rejection): shows the save-failure toast and stays put', async () => {
    vi.mocked(writeBuffer).mockClear();
    vi.mocked(navigation.goto).mockClear();
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole, getByTestId, findByText } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat jídlo' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kopírovat sem' }));
    await tick();
    // Force the destination save to reject (a Dexie quota/transaction error).
    // The defensive Result branch surfaces a generic save-failure toast and
    // keeps the picker open. Armed right before the confirming tap so only the
    // copy's write is affected.
    const putSpy = vi.spyOn(db.meals, 'put').mockRejectedValue(new Error('QuotaExceededError'));
    vi.mocked(navigation.goto).mockClear();
    vi.mocked(writeBuffer).mockClear();
    try {
      await fireEvent.click(getByTestId('fab-meal-type-dinner'));
      expect(
        await findByText('Kopírování se nezdařilo, zkuste to prosím znovu.'),
      ).toBeInTheDocument();
      expect(vi.mocked(navigation.goto)).not.toHaveBeenCalled();
      expect(vi.mocked(writeBuffer)).not.toHaveBeenCalled();
    } finally {
      putSpy.mockRestore();
    }
  });

  it('US-17: a manual edit-save of the destination slot clears a stale meal-copy buffer', async () => {
    // Simulate landing on the destination slot right after a copy: the single
    // discard buffer holds a meal-copy for this exact slot.
    mockDiscardBuffer.set({
      kind: 'meal-copy',
      destinationSlot: { date: today, mealType: 'lunch', actor: 'mother' },
      addedItemIds: ['copied-1'],
      destinationPreexisted: false,
      priorUpdatedAt: undefined,
      date: today,
      returnTo: `/day/${today}`,
    } as never);
    vi.mocked(clearBuffer).mockClear();
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [
        { id: 'copied-1', name: 'Brambory', foodId: 'brambory', amount: 'portion' },
        { id: 'hand-1', name: 'Rýže', foodId: 'ryze', amount: 'portion' },
      ],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    // Dirty the destination slot with a manual edit (remove a food), then save.
    await findByRole('button', { name: /^Brambory$/ });
    await fireEvent.click(await findByRole('button', { name: /Odebrat Rýže/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Uložit změny' }));
    await tick();
    await waitFor(() => expect(vi.mocked(clearBuffer)).toHaveBeenCalled());
  });

  it('empty-meal hint (saving deletes it) visible when editing an existing meal with zero foods', async () => {
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, queryByText, getByText } = render(MealPage);
    // Wait for hydration: the food row appears.
    await findByRole('button', { name: /^Brambory$/ });
    // Hint not yet — there's a food.
    expect(queryByText(/uložením ho smažeš/)).not.toBeInTheDocument();
    // ✕ the only food via the working-list remove button.
    await fireEvent.click(await findByRole('button', { name: /Odebrat Brambory/ }));
    await tick();
    expect(getByText(/uložením ho smažeš/)).toBeInTheDocument();
  });

  it('saving an emptied existing meal deletes the row and writes a meal-delete undo buffer (issue #588)', async () => {
    // The route-level counterpart to the editor's finalize→'deleted' test: at
    // the CTA seam, saving an emptied edit removes the Dexie row (not a silent
    // no-op restoring the old foods, the #586 bug) and writes the delete buffer
    // so the layout toast + undo behave like the explicit "Smazat jídlo".
    vi.mocked(writeBuffer).mockClear();
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    // Empty the meal, then save via the (now-enabled) "Uložit změny" CTA.
    await fireEvent.click(await findByRole('button', { name: /Odebrat Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Uložit změny' }));
    await waitFor(async () =>
      expect(await meals.loadBySlot('2025-06-13', 'lunch', 'mother')).toEqual({
        ok: true,
        data: null,
      }),
    );
    // The undo buffer was written as a delete (so "Jídlo smazáno" + Zpět show).
    expect(vi.mocked(writeBuffer)).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'meal-delete', actor: 'mother', mealType: 'lunch' }),
    );
  });

  it('empty-meal hint NOT visible when composing a brand-new meal with zero foods', async () => {
    // beforeEach clears db.meals — composing-new.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    await tick();
    expect(queryByText(/uložením ho smažeš/)).not.toBeInTheDocument();
  });

  // Dirty-CTA rendering (`Uložit změny` disabled/enabled) is covered end-to-end
  // by `tests/e2e/meal-cta-enabledness.test.ts`; the underlying `dirty`/
  // `canFinalize` transitions are covered by `meal-editor.test.ts`.
  //
  // The working-list amount + preparation suffix (`Lžíce · Vařené`) is covered
  // end-to-end by `tests/e2e/meal-amount-label.test.ts`.
  //
  // The `eyebrow` / `body-muted` / `caption` typography assertions on the
  // section headers, notes label, and top-right date are covered end-to-end by
  // `tests/e2e/meal-typography.test.ts`.
});
