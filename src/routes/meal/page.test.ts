import { tick } from 'svelte';
import { writable } from 'svelte/store';

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { db } from '$lib/db/atopic-db';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';
import type { GeneratedSchedule, Meal, QuestionnaireAnswers } from '$lib/domain/models';
import type { ScheduleRaw } from '$lib/stores/schedule-context';

const catalog = new BundledCatalogAdapter();

const mockScheduleRaw = writable<ScheduleRaw>({ status: 'loading' });
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleRaw: { subscribe: mockScheduleRaw.subscribe },
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

const meals = new DexieMealRepository(db, new DexieScheduleRepository(db));

const mockPage: { url: URL; state: Record<string, unknown> } = {
  url: new URL('http://localhost/meal'),
  state: {},
};
vi.mock('$app/state', () => ({ page: mockPage }));

const mockHarvestStore = writable<HarvestCandidate[]>([]);
vi.mock('$lib/stores/harvest-candidate-session', () => ({
  harvestCandidateSession: {
    subscribe: mockHarvestStore.subscribe,
    readByKey: vi.fn().mockResolvedValue({ ok: true, data: null }),
    // The real session optimistically upserts into its in-memory store, so
    // newly-typed custom foods render immediately. The stub mirrors that
    // shape so the editing-after-Přidat rendering tests stay realistic.
    upsert: (candidate: HarvestCandidate) => {
      mockHarvestStore.update((list) => {
        const idx = list.findIndex((c) => c.normalizedKey === candidate.normalizedKey);
        return idx >= 0 ? list.map((c, i) => (i === idx ? candidate : c)) : [...list, candidate];
      });
      return Promise.resolve({ ok: true, data: undefined });
    },
  },
}));

const today = new Date().toISOString().split('T')[0]!;
const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]!;

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: today,
  completedAt: new Date().toISOString(),
  testedAllergens: ['dairy'],
};

const dairyEliminationSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: today,
  estimatedEndDate: future,
  phases: [
    { id: 'elim', type: 'elimination', allergenIds: ['dairy'], startDate: today, endDate: future },
  ],
};

const emptySchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: today,
  estimatedEndDate: future,
  phases: [{ id: 'elim', type: 'elimination', allergenIds: [], startDate: today, endDate: future }],
};

function setReadyWithElim() {
  mockScheduleRaw.set({
    status: 'ready',
    schedule: dairyEliminationSchedule,
    answers: sampleAnswers,
  });
}
function setReady() {
  mockScheduleRaw.set({ status: 'ready', schedule: emptySchedule, answers: sampleAnswers });
}

beforeEach(async () => {
  mockScheduleRaw.set({ status: 'loading' });
  await db.meals.clear();
  mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  mockPage.state = {};
  mockHarvestStore.set([]);
});

describe('meal/+page.svelte', () => {
  // ── Layout: NO meal type pills (type is fixed at entry, ADR-0018) ────────

  it('does NOT render meal type pills — type is bound to the URL', async () => {
    setReady();
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

  // ── Layout: family grid ───────────────────────────────────

  it('renders "Všechny kategorie" label and family grid on initial load', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText('Všechny kategorie')).toBeInTheDocument();
  });

  // ── Drill-in navigation ───────────────────────────────────

  it('tapping a family tile shows the drill-in: header title changes to family name', async () => {
    setReady();
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
    setReady();
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
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Procházet rodiny')).not.toBeInTheDocument();
  });

  // ── Tapping a food starts editing ────────────────────────

  it('tapping a food in drill-in puts it in editing (shows Množství + Příprava)', async () => {
    setReady();
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
    setReady();
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
    setReady();
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
    setReady();
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
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    expect(getByRole('textbox', { name: /Poznámka/ })).toBeInTheDocument();
  });

  // ── Schedule banners (preserved) ─────────────────────────

  // Vlastní drill-in behavior (list previously-typed customs, new-food →
  // editing, re-tap harvest chip → editing, grid has no standalone
  // custom-food input) is covered end-to-end by
  // `tests/e2e/meal-custom-food.test.ts`.

  it('food chips in an eliminated allergen show data-state="danger"', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    const token = getByRole('button', { name: /Kravské mléko/ });
    expect(token.closest('[data-state="danger"]')).not.toBeNull();
  });

  it('food chips in a non-eliminated allergen do NOT have data-state="danger"', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Ovoce/ }));
    await tick();
    const token = getByRole('button', { name: /^Jahody$/ });
    expect(token.closest('[data-state="danger"]')).toBeNull();
  });

  // ── Grid working-list: tap-to-edit ───────────────────────
  // Row-tap opens the inline editor, ✕ removes the row, outside-click confirms
  // and re-tap opens a second row while confirming the first — all covered
  // end-to-end by `tests/e2e/meal-modal-edit.test.ts` (AC245-* group).

  // ── Conflict styling: CTA button + grid working-list ────────

  it('CTA is danger-red when working meal contains a confirmed eliminated-today food', async () => {
    setReadyWithElim(); // dairy is eliminated today
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Add and confirm a dairy food
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Back on grid — CTA should be danger-red
    const cta = getByRole('button', { name: /Uložit Oběd/ });
    expect(cta.className).toContain('bg-danger');
  });

  it('CTA reverts to primary when the eliminated-today food is removed', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Remove the eliminated food
    const removeBtn = getByRole('button', { name: /Odebrat Kravské mléko/ });
    await fireEvent.click(removeBtn);
    await tick();
    // CTA should be back to primary (aria-disabled since nothing confirmed)
    const cta = getByRole('button', { name: 'Uložit' });
    expect(cta.className).not.toContain('bg-warning');
  });

  it('confirmed eliminated-today food in grid working-list shows data-state="danger-confirmed"', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // The grid working-list row for an eliminated confirmed food should be danger-confirmed
    const token = getByRole('button', { name: 'Kravské mléko' });
    expect(token.closest('[data-state="danger-confirmed"]')).not.toBeNull();
  });

  it('editing an eliminated-today food in the grid shows a conflict warning', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Open grid row editor for the eliminated food
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    expect(queryByText(/Vyloučeno|vyloučeno/)).toBeInTheDocument();
  });

  // ── Bug fixes: eliminated-food CTA + grid working-list order ────

  it('CTA is danger-red when saving a family that contains an eliminated food (no individual food editing)', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Drill into dairy family and confirm a food — but do NOT save individual food first
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    // Now in "Uložit Mléko" state — no individual food editing, but eliminated food is confirmed
    const cta = getByRole('button', { name: /Uložit Mléko/ });
    expect(cta.className).toContain('bg-danger');
  });

  it('CTA is primary when saving a family with no eliminated foods', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Drill into Zelenina (not eliminated)
    await fireEvent.click(getByRole('button', { name: /Zelenina/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Brambory/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Brambory/ }));
    await tick();
    // "Uložit Zelenina" — no eliminated food, should be primary
    const cta = getByRole('button', { name: /Uložit Zelenina/ });
    expect(cta.className).toContain('bg-primary');
    expect(cta.className).not.toContain('bg-danger');
  });

  it('confirmed eliminated grid row: amount text is white (visible on red background)', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, container } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // The amount span inside the danger-confirmed row should have text-white class
    const dangerRow = container.querySelector('[data-state="danger-confirmed"]');
    expect(dangerRow).not.toBeNull();
    const amountSpan = dangerRow!.querySelector('span.text-white');
    expect(amountSpan).not.toBeNull();
  });

  it('opening a grid row editor does not remove sibling foods from the working list', async () => {
    setReady();
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
    setReady();
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

  // ── Discard guard mechanics live in the MealEditor + e2e tests ───────────
  // Buffer-write rules are covered by `discardDescriptor` unit tests in
  // `meal-editor.test.ts`; the browser popstate gate is covered by
  // `tests/e2e/meal-discard-guard.test.ts` and `meal-dirty-discard.test.ts`.

  // ── Initial load of the pre-selected slot (bug: foods missing on landing) ──

  function lunchWithBramboryMeal(): Meal {
    return {
      id: '2025-06-13:lunch',
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
    setReady();
    // beforeEach clears db.meals — empty slot.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    await tick();
    expect(queryByRole('button', { name: 'Více' })).not.toBeInTheDocument();
  });

  it('renders the ⋯ overflow when editing an existing meal', async () => {
    setReady();
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    expect(await findByRole('button', { name: 'Více' })).toBeInTheDocument();
  });

  it('tapping ⋯ opens the confirm sheet with "Smazat jídlo" + "Zrušit"', async () => {
    setReady();
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

  it('tapping "Zrušit" in the confirm sheet closes it', async () => {
    setReady();
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

  it('empty-meal hint visible when editing an existing meal with zero foods', async () => {
    setReady();
    mockPage.url = new URL(
      'http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13',
    );
    await meals.save(lunchWithBramboryMeal());
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, queryByText, getByText } = render(MealPage);
    // Wait for hydration: the food row appears.
    await findByRole('button', { name: /^Brambory$/ });
    // Hint not yet — there's a food.
    expect(queryByText(/aspoň jednu položku/)).not.toBeInTheDocument();
    // ✕ the only food via the working-list remove button.
    await fireEvent.click(await findByRole('button', { name: /Odebrat Brambory/ }));
    await tick();
    expect(getByText(/aspoň jednu položku/)).toBeInTheDocument();
  });

  it('empty-meal hint NOT visible when composing a brand-new meal with zero foods', async () => {
    setReady();
    // beforeEach clears db.meals — composing-new.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    await tick();
    expect(queryByText(/aspoň jednu položku/)).not.toBeInTheDocument();
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

  // ── Reintroduction dose caption ─────────────────────────────
  // The banner text sources from LadderStep.dose at the rung whose index
  // matches `dayInPhase - 1` on the allergen's breastfed-stage ladder
  // (ADR-0023). These assert *wiring* — the page renders the ladder's dose at
  // the right rung. They are NOT a migration-parity gate: they read the current
  // `LadderStep.dose`, so they cannot catch a caption mis-transcribed from the
  // old `instructionCs` during authoring. The frozen parity that matters —
  // `isEvaluationDay` — lives in `schedule-queries.test.ts`; dose-caption
  // correctness is covered by the well-formedness gate (ladder.test.ts) plus
  // curator review.

  it('reintroduction banner shows the ladder step dose for the current day-in-phase', async () => {
    const ladderStep = catalog.get('dairy')!.ladder!.stages.breastfed![0]!;
    const reintroDay1: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: future,
      phases: [
        {
          id: 'reintro-dairy',
          type: 'reintroduction',
          allergenIds: ['dairy'],
          startDate: today,
          endDate: future,
        },
      ],
    };
    mockScheduleRaw.set({ status: 'ready', schedule: reintroDay1, answers: sampleAnswers });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    // Caption format: `<dose> (<category name>)`
    expect(getByText(new RegExp(ladderStep.dose.slice(0, 20)))).toBeInTheDocument();
  });

  it('reintroduction banner caption changes with the rung at each day-in-phase', async () => {
    const ladder = catalog.get('dairy')!.ladder!.stages.breastfed!;
    // Day 3 in phase: startDate is 2 days before today
    const startDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]!;
    const endDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]!;
    const reintroDay3: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate,
      estimatedEndDate: endDate,
      phases: [
        { id: 'reintro-dairy', type: 'reintroduction', allergenIds: ['dairy'], startDate, endDate },
      ],
    };
    mockScheduleRaw.set({ status: 'ready', schedule: reintroDay3, answers: sampleAnswers });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    // Rung 3 dose text — a stable slice unique to that rung
    expect(getByText(new RegExp(ladder[2]!.dose.slice(0, 20)))).toBeInTheDocument();
  });
});
