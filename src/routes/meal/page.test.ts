import { tick } from 'svelte';
import { writable } from 'svelte/store';

import * as navigation from '$app/navigation';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { db } from '$lib/db/atopic-db';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';
import type { GeneratedSchedule, Meal, QuestionnaireAnswers } from '$lib/domain/models';
import { clearBuffer, writeBuffer } from '$lib/stores/discard-buffer';
import type { ScheduleRaw } from '$lib/stores/schedule-context';

const catalog = new BundledCatalogAdapter();

const mockScheduleRaw = writable<ScheduleRaw>({ status: 'loading' });
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleRaw: { subscribe: mockScheduleRaw.subscribe },
}));
const mockSettings = writable<{ feedingStage: 'breastfed' | 'mixed' | 'solids' } | null>({
  feedingStage: 'breastfed',
});
vi.mock('$lib/stores/settings-context', () => ({
  settingsContext: { subscribe: mockSettings.subscribe },
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
  feedingStage: 'breastfed',
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
  // Reset the feeding stage to the default so a test that changes it (and may
  // fail before its own cleanup line) can't leak the stage into the next test.
  mockSettings.set({ feedingStage: 'breastfed' });
  await db.meals.clear();
  await db.skin_observations.clear();
  mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  mockPage.state = {};
  mockHarvestStore.set([]);
  mockDiscardBuffer.set(null);
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

  // ── Actor picker (issue #569, spec #564) ───────────────────
  // In `mixed` the mother chooses whose meal she's logging; in
  // `breastfed`/`solids` a single actor is implicit — no picker.

  it('renders the Já / Miminko actor pills in the mixed feeding stage', async () => {
    setReady();
    mockSettings.set({ feedingStage: 'mixed' });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    expect(getByRole('button', { name: 'Já' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Miminko' })).toBeInTheDocument();
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('renders NO actor picker in the breastfed feeding stage', async () => {
    setReady();
    mockSettings.set({ feedingStage: 'breastfed' });
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: 'Já' })).toBeNull();
    expect(queryByRole('button', { name: 'Miminko' })).toBeNull();
  });

  it('renders NO actor picker in the solids feeding stage', async () => {
    setReady();
    mockSettings.set({ feedingStage: 'solids' });
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: 'Já' })).toBeNull();
    expect(queryByRole('button', { name: 'Miminko' })).toBeNull();
    mockSettings.set({ feedingStage: 'breastfed' });
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

  // ── Actor picker routes to the actor's slot (issue #569) ─────────────────
  // Selecting an actor pill re-opens the editor for `${date}:${mealType}:${actor}`,
  // so the meal is composed against — and saved to — that actor's own slot.
  // Both meals in a slot coexist under the composite key; switching pills swaps
  // which one hydrates.

  it('switching to Miminko hydrates the baby meal from its own slot', async () => {
    setReadyWithElim();
    mockSettings.set({ feedingStage: 'mixed' });
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
      items: [{ id: 'b1', name: 'Rýže', foodId: 'other:rice', amount: 'portion' }],
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
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('shows the forward "Hotovo" CTA on the actor whose work a swap autosaved (issue #571)', async () => {
    setReady();
    mockSettings.set({ feedingStage: 'mixed' });
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
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('keeps the disabled "Uložit změny" CTA after cycling actor tabs without editing (issue #587)', async () => {
    setReadyWithElim();
    mockSettings.set({ feedingStage: 'mixed' });
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
      items: [{ id: 'b1', name: 'Rýže', foodId: 'other:rice', amount: 'portion' }],
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
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('deleting on the Miminko pill removes the baby slot, leaving the mother meal intact', async () => {
    setReadyWithElim();
    mockSettings.set({ feedingStage: 'mixed' });
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
      items: [{ id: 'b1', name: 'Rýže', foodId: 'other:rice', amount: 'portion' }],
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
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  // ── Incoming ?actor= pre-selects the tapped actor (issue #584) ───────────
  // The day view carries the tapped actor into the meal editor via `?actor=`.
  // In the mixed stage both actors are eligible, so without this the editor
  // always seeds `mother`. Entering with `?actor=baby` must hydrate the baby's
  // slot directly, not the mother's.

  it('mixed stage: entering with ?actor=baby hydrates the baby meal', async () => {
    setReadyWithElim();
    mockSettings.set({ feedingStage: 'mixed' });
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
      items: [{ id: 'b1', name: 'Rýže', foodId: 'other:rice', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, queryByRole } = render(MealPage);
    // Lands on the baby slot → Rýže hydrated, not Brambory.
    await findByRole('button', { name: /^Rýže$/ });
    expect(queryByRole('button', { name: /^Brambory$/ })).toBeNull();
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('composes for the baby slot in the solids stage (implicit single actor)', async () => {
    setReadyWithElim();
    mockSettings.set({ feedingStage: 'solids' });
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Rýže', foodId: 'other:rice', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    // No picker in solids; the baby's meal hydrates as the implicit actor.
    await findByRole('button', { name: /^Rýže$/ });
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  // ── Actor-aware in-editor conflict detection (spec #564/#568, US14/15) ──
  // The editor must check the working meal against the *selected* actor's
  // eliminated set — protocol ∪ that actor's permanent allergies — not always
  // the mother's. A baby-only permanent (permanentBaby ≠ permanentMother) must
  // flag on the baby's meal and must NOT flag on the mother's.

  // dairy is permanent for the BABY only; the mother has no permanents and the
  // protocol eliminates nothing, so mother meals see an empty eliminated set.
  const babyOnlyDairySchedule: GeneratedSchedule = {
    permanentMother: [],
    permanentBaby: ['dairy'],
    startDate: today,
    estimatedEndDate: future,
    phases: [
      { id: 'elim', type: 'elimination', allergenIds: [], startDate: today, endDate: future },
    ],
  };
  function setReadyBabyOnlyDairy() {
    mockScheduleRaw.set({
      status: 'ready',
      schedule: babyOnlyDairySchedule,
      answers: sampleAnswers,
    });
  }

  it('flags a baby-permanent food against the baby set in the solids stage (US14)', async () => {
    setReadyBabyOnlyDairy();
    mockSettings.set({ feedingStage: 'solids' });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, container } = render(MealPage);
    await tick();
    // Compose a dairy food for the implicit baby actor and confirm it.
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Checked against permanentBaby → the confirmed row is danger-flagged.
    // A hardcoded mother set (empty here) would leave it un-flagged (the H1 bug).
    expect(container.querySelector('[data-state="danger-confirmed"]')).not.toBeNull();
    mockSettings.set({ feedingStage: 'breastfed' });
  });

  it('does NOT flag the baby-permanent food on the mother slot, but DOES after switching to Miminko (US14/15)', async () => {
    setReadyBabyOnlyDairy();
    mockSettings.set({ feedingStage: 'mixed' });
    mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
    // Same dairy food logged in BOTH actors' slots.
    await meals.save({
      id: `${today}:lunch:mother`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Kravské mléko', foodId: 'kravske-mleko', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    await meals.save({
      id: `${today}:lunch:baby`,
      date: today,
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Kravské mléko', foodId: 'kravske-mleko', amount: 'portion' }],
      createdAt: new Date().toISOString(),
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, findByRole, container } = render(MealPage);
    // Mother slot: dairy is not in her (empty) eliminated set → the confirmed
    // grid row is NOT danger-flagged.
    await findByRole('button', { name: 'Kravské mléko' });
    await tick();
    expect(container.querySelector('[data-state="danger-confirmed"]')).toBeNull();
    // Switch to the baby: swap-on-dirty autosaves the (clean) mother meal, then
    // re-opens the baby slot. Its eliminated set (permanentBaby) flips the same
    // confirmed food into a danger-flagged row once setEliminatedToday flushes.
    await fireEvent.click(getByRole('button', { name: 'Miminko' }));
    await findByRole('button', { name: 'Kravské mléko' });
    await waitFor(() =>
      expect(container.querySelector('[data-state="danger-confirmed"]')).not.toBeNull(),
    );
    mockSettings.set({ feedingStage: 'breastfed' });
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

  it('tapping ⋯ opens the action list with "Smazat jídlo" + "Zrušit"', async () => {
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

  it('tapping "Zrušit" in the action list closes it', async () => {
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

  // ── Copy-meal entry point + destination picker (spec #599, issue #606) ──

  it('shows "Kopírovat jídlo" in the ⋯ action list when the source meal has ≥1 food', async () => {
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReadyWithElim();
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
    expect(getByRole('button', { name: 'Kopírovat sem' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    // The strip ends at today: no future cell is ever rendered (§3b/§3e).
    await waitFor(() => {
      const futureCell = container.querySelector(
        `[data-testid="day-strip-cell"][data-date="${future}"]`,
      );
      expect(futureCell).toBeNull();
    });
  });

  it('picker: the strip spans back to the earliest logged day, and it is a selectable destination', async () => {
    setReadyWithElim();
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
    expect(getByRole('button', { name: 'Kopírovat sem' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('confirm copy (success): persists the destination meal, navigates to the dest day, writes a meal-copy buffer', async () => {
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReadyWithElim();
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
    setReady();
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
    setReady();
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
