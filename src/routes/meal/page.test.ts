import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers, Meal } from '$lib/domain/models';

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
  get discardBuffer() { return mockDiscardBuffer; },
  writeBuffer: vi.fn(),
  clearBuffer: vi.fn(),
}));

// `mockLoadBySlot` is the only assertion-free hook still used by tests:
// rendering tests that need an existing meal in edit mode seed Dexie's
// shape via `.mockImplementation(...)`. Save/remove call assertions live
// in `meal-editor.test.ts` (the editor owns those code paths).
const mockLoadBySlot = vi.fn().mockResolvedValue({ ok: true, data: null });
const mockMealSessionStore = writable<Meal[]>([]);
vi.mock('$lib/stores/meal-session', () => ({
  mealSession: {
    subscribe: mockMealSessionStore.subscribe,
    save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    loadBySlot: (...args: unknown[]) => mockLoadBySlot(...args),
    remove: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  },
  createMealSession: () => ({
    subscribe: mockMealSessionStore.subscribe,
    save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    loadBySlot: (...args: unknown[]) => mockLoadBySlot(...args),
    remove: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  }),
}));
vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

const mockPage: { url: URL; state: Record<string, unknown> } = {
  url: new URL('http://localhost/meal'),
  state: {},
};
vi.mock('$app/state', () => ({ page: mockPage }));

const mockHarvestStore = writable<import('$lib/domain/harvest-candidate').HarvestCandidate[]>([]);
vi.mock('$lib/stores/harvest-candidate-session', () => ({
  harvestCandidateSession: {
    subscribe: mockHarvestStore.subscribe,
    readByKey: vi.fn().mockResolvedValue({ ok: true, data: null }),
    // The real session optimistically upserts into its in-memory store, so
    // newly-typed custom foods render immediately. The stub mirrors that
    // shape so the editing-after-Přidat rendering tests stay realistic.
    upsert: (candidate: import('$lib/domain/harvest-candidate').HarvestCandidate) => {
      mockHarvestStore.update(list => {
        const idx = list.findIndex(c => c.normalizedKey === candidate.normalizedKey);
        return idx >= 0 ? list.map((c, i) => (i === idx ? candidate : c)) : [...list, candidate];
      });
      return Promise.resolve({ ok: true, data: undefined });
    },
  },
}));

const today = new Date().toISOString().split('T')[0];
const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

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
  permanentMother: [], permanentBaby: [],
  startDate: today, estimatedEndDate: future,
  phases: [{ id: 'elim', type: 'elimination', allergenIds: ['dairy'], startDate: today, endDate: future }],
};

const emptySchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today, estimatedEndDate: future,
  phases: [{ id: 'elim', type: 'elimination', allergenIds: [], startDate: today, endDate: future }],
};

function setReadyWithElim() {
  mockScheduleRaw.set({ status: 'ready', schedule: dairyEliminationSchedule, answers: sampleAnswers });
}
function setReady() {
  mockScheduleRaw.set({ status: 'ready', schedule: emptySchedule, answers: sampleAnswers });
}

beforeEach(() => {
  mockScheduleRaw.set({ status: 'loading' });
  mockLoadBySlot.mockClear();
  mockLoadBySlot.mockResolvedValue({ ok: true, data: null });
  mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
  mockPage.state = {};
  mockHarvestStore.set([]);
});

describe('meal/+page.svelte', () => {

  // ── Layout: NO meal type pills (type is fixed at entry, ADR-0018) ────────

  it('does NOT render meal type pills — type is bound to the URL', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    // No standalone Snídaně/Oběd/Svačina/Večeře pill buttons (CTA may include them).
    const pillCandidates = ['Snídaně', 'Oběd', 'Svačina', 'Večeře'].map(name =>
      queryByRole('button', { name }),
    );
    expect(pillCandidates.every(b => b === null)).toBe(true);
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

  // ── CTA label changes ────────────────────────────────────

  it('CTA reads "Uložit {Food}" while a food is editing', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    const cta = getByRole('button', { name: /Uložit Kravské mléko/ });
    expect(cta).toBeInTheDocument();
  });

  it('CTA reads "Uložit {Family}" when in drill-in with nothing editing', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    const cta = getByRole('button', { name: /Uložit Mléko/ });
    expect(cta).toBeInTheDocument();
  });

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

  it('CTA reads "Uložit {MealType}" on grid when confirmed foods exist (compose-new)', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Navigate to dairy, tap a food, confirm it, come back
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    // Confirm: click "Uložit Kravské mléko"
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    // Commit family: click "Uložit Mléko"
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Back on grid — button should now read "Uložit Oběd" (compose-new finalize).
    const cta = getByRole('button', { name: /Uložit Oběd/ });
    expect(cta).toBeInTheDocument();
  });

  // ── Confirm + cancel food ────────────────────────────────

  it('"Uložit {Food}" confirms the food (editor collapses, others unlock)', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    expect(queryByText('Množství')).not.toBeInTheDocument();
    // Jogurt should be unlocked now — able to tap it
    const jogurt = getByRole('button', { name: 'Jogurt' });
    expect(jogurt).not.toBeDisabled();
  });

  it('editing a sibling in the drill-in: confirmed sibling stays visible as locked-confirmed', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, container } = render(MealPage);
    await tick();
    // Drill into Mléko, confirm Kravské mléko
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    // Now start editing a sibling in the same family (Jogurt)
    await fireEvent.click(getByRole('button', { name: 'Jogurt' }));
    await tick();
    // Kravské mléko (the previously-confirmed sibling) should now be locked
    // but render as locked-confirmed so the user can still see "in the meal".
    const lockedConfirmed = container.querySelector('[data-state="locked-confirmed"]');
    expect(lockedConfirmed).not.toBeNull();
    expect(lockedConfirmed?.textContent).toContain('Kravské mléko');
  });

  it('editing a sibling in the drill-in: idle siblings render as locked (greyed out)', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, container } = render(MealPage);
    await tick();
    // Drill into Mléko, confirm Kravské mléko, then edit Jogurt
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Jogurt' }));
    await tick();
    // An idle sibling such as Sójové mléko — never confirmed — should be locked + grey
    // (data-state="locked", not "locked-confirmed").
    const lockedTiles = container.querySelectorAll('[data-state="locked"]');
    const lockedIdleNames = [...lockedTiles].map(el => el.textContent ?? '');
    expect(lockedIdleNames.some(n => n.includes('Sójové mléko'))).toBe(true);
  });

  it('re-tapping editing food cancels it back to idle, caches nothing', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' })); // exact match, not the CTA
    await tick();
    // Re-tap the editing food
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    expect(queryByText('Množství')).not.toBeInTheDocument();
  });

  // ── mealSession.save call site is covered in MealEditor unit tests ───────
  // (`createMealEditor — finalize() compose-new`/`finalize() on edit`).

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


  // ── Vlastní drill-in: previously-typed custom foods ──────

  it('Vlastní drill-in lists previously-typed custom foods for re-logging', async () => {
    setReady();
    mockHarvestStore.set([
      {
        normalizedKey: 'kokos', status: 'pending', count: 1,
        firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
        rawForms: ['Kokos'],
      },
    ]);
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: /^Kokos$/ })).not.toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Vlastní/ }));
    await tick();
    expect(getByRole('button', { name: /^Kokos$/ })).toBeInTheDocument();
  });

  // ── AC2: new custom food → editing + harvest upsert ──────

  it('typing a new food name and clicking Přidat puts it in editing (shows Množství)', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Vlastní/ }));
    await tick();
    const input = getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Špenát' } });
    await tick();
    await fireEvent.click(getByRole('button', { name: /Přidat/ }));
    await tick();
    await tick(); // extra tick for async handleNewCustomFood
    expect(queryByText('Množství')).toBeInTheDocument();
    expect(queryByText('Příprava')).toBeInTheDocument();
  });

  it('CTA reads "Uložit Špenát" while new custom food is in editing', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Vlastní/ }));
    await tick();
    const input = getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Špenát' } });
    await tick();
    await fireEvent.click(getByRole('button', { name: /Přidat/ }));
    await tick();
    await tick(); // extra tick for async handleNewCustomFood
    expect(getByRole('button', { name: /Uložit Špenát/ })).toBeInTheDocument();
  });

  // ── AC3: re-tapping a harvest chip enters modal-edit flow ──

  it('tapping an existing harvest chip in Vlastní enters editing (shows Množství)', async () => {
    setReady();
    mockHarvestStore.set([
      {
        normalizedKey: 'kokos', status: 'pending', count: 1,
        firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
        rawForms: ['Kokos'],
      },
    ]);
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Vlastní/ }));
    await tick();
    expect(queryByText('Množství')).not.toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /^Kokos$/ }));
    await tick();
    expect(queryByText('Množství')).toBeInTheDocument();
  });

  it('re-tap harvest chip: CTA reads "Uložit Kokos"', async () => {
    setReady();
    mockHarvestStore.set([
      {
        normalizedKey: 'kokos', status: 'pending', count: 1,
        firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
        rawForms: ['Kokos'],
      },
    ]);
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Vlastní/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /^Kokos$/ }));
    await tick();
    expect(getByRole('button', { name: /Uložit Kokos/ })).toBeInTheDocument();
  });

  // ── AC5: no standalone custom-food input on the grid ─────

  it('grid screen has no standalone custom-food text input', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    // Only the Poznámka textarea should be present; no other textbox
    const textboxes = queryByRole('textbox', { name: /Název potraviny|vlastní|custom/i });
    expect(textboxes).not.toBeInTheDocument();
  });

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

  it('tapping a working-list row on the grid opens the inline editor for that food', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    // Add and commit Kravské mléko to the working list
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Back on grid — tap the working-list row
    expect(queryByText('Množství')).not.toBeInTheDocument();
    const row = getByRole('button', { name: 'Kravské mléko' });
    await fireEvent.click(row);
    await tick();
    expect(queryByText('Množství')).toBeInTheDocument();
    expect(queryByText('Příprava')).toBeInTheDocument();
  });

  it('while a working-list row is editing, CTA reads "Uložit {Food}"', async () => {
    setReady();
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
    // Tap the working-list row to edit it
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    expect(getByRole('button', { name: /Uložit Kravské mléko/ })).toBeInTheDocument();
  });

  it('while a grid row is editing, family-grid tiles do not drill in', async () => {
    setReady();
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
    // Tap working-list row to start editing
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    // Clicking a family tile cancels the edit (outside-click) and does NOT drill in
    await fireEvent.click(getByRole('button', { name: /Ovoce/ }));
    await tick();
    // Still on grid — "Všechny kategorie" label visible, no drill-in heading
    expect(queryByText('Všechny kategorie')).toBeInTheDocument();
    // Food still in the working list
    expect(getByRole('button', { name: 'Kravské mléko' })).toBeInTheDocument();
  });

  it('confirming a working-list row edit collapses the editor and updates the row', async () => {
    setReady();
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
    // Tap working-list row
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    // Confirm via CTA
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    // Editor should be collapsed
    expect(queryByText('Množství')).not.toBeInTheDocument();
    // Food still in the list
    expect(getByRole('button', { name: 'Kravské mléko' })).toBeInTheDocument();
  });

  // ── Grid working-list: ✕ remove ─────────────────────────

  it('✕ on a working-list row removes that food from the working list', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Click the remove button (✕) on the Kravské mléko row
    const removeBtn = getByRole('button', { name: /Odebrat Kravské mléko|×|✕|remove/i });
    await fireEvent.click(removeBtn);
    await tick();
    expect(queryByRole('button', { name: /Kravské mléko/ })).not.toBeInTheDocument();
  });

  it('clicking outside the working-list editor confirms the food (food stays, editor closes)', async () => {
    setReady();
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
    // Open inline editor on the grid row
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    expect(queryByText('Množství')).toBeInTheDocument();
    // Click the notes textarea — outside any [data-food-tile]
    await fireEvent.click(getByRole('textbox', { name: /Poznámka/ }));
    await tick();
    // Editor collapsed, food still present and confirmed
    expect(queryByText('Množství')).not.toBeInTheDocument();
    expect(getByRole('button', { name: 'Kravské mléko' })).toBeInTheDocument();
    expect(getByRole('button', { name: /Uložit Oběd/ })).toBeInTheDocument();
  });

  it('tapping another working-list row while one is editing confirms the first and opens the second', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    // Add two foods to the working list: Kravské mléko (dairy) and Brambory (vegetables)
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
    // Both foods in the working list — open editor on first food
    await fireEvent.click(getByRole('button', { name: 'Kravské mléko' }));
    await tick();
    expect(queryByText('Množství')).toBeInTheDocument();
    expect(getByRole('button', { name: /Uložit Kravské mléko/ })).toBeInTheDocument();
    // Tap the second food — should confirm first and open second
    await fireEvent.click(getByRole('button', { name: 'Brambory' }));
    await tick();
    // First food editor gone, second food editor open
    expect(getByRole('button', { name: /Uložit Brambory/ })).toBeInTheDocument();
    // Still exactly one editor open
    expect(queryByText('Množství')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-food-tile]').length).toBeGreaterThanOrEqual(2);
  });

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
    const names = [...foodTiles].map(el => el.textContent?.trim() ?? '');
    const milkIdx = names.findIndex(n => n.includes('Kravské mléko'));
    const potatoIdx = names.findIndex(n => n.includes('Brambory'));
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
    const beforeTiles = [...document.querySelectorAll('[data-food-tile]')].map(el => el.textContent?.trim() ?? '');
    // Open editor on Brambory (second item)
    await fireEvent.click(getByRole('button', { name: 'Brambory' }));
    await tick();
    // Capture order after — Brambory must stay at same index
    const afterTiles = [...document.querySelectorAll('[data-food-tile]')].map(el => el.textContent?.trim() ?? '');
    const beforeBramborIdx = beforeTiles.findIndex(n => n.includes('Brambory'));
    const afterBramborIdx = afterTiles.findIndex(n => n.includes('Brambory'));
    expect(afterBramborIdx).toBe(beforeBramborIdx);
  });

  // ── Discard guard mechanics live in the MealEditor + e2e tests ───────────
  // Buffer-write rules are covered by `discardDescriptor` unit tests in
  // `meal-editor.test.ts`; the browser popstate gate is covered by
  // `tests/e2e/meal-discard-guard.test.ts` and `meal-dirty-discard.test.ts`.

  // ── Initial load of the pre-selected slot (bug: foods missing on landing) ──

  function lunchWithBrambory() {
    return {
      ok: true,
      data: {
        id: '2025-06-13:lunch',
        date: '2025-06-13',
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'portion' }],
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Slot hydration is exercised by the rendering tests below (which seed an
  // existing meal via `mockLoadBySlot.mockImplementation`) and verified at the
  // editor boundary in `meal-editor.test.ts` (`open()` on a saved slot).

  // ── Explicit delete + empty-Hotovo guard (issue #268) ─────

  it('does NOT render the ⋯ overflow when composing a brand-new meal (empty slot)', async () => {
    setReady();
    // Default beforeEach: mockLoadBySlot returns { ok: true, data: null } — empty slot.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByRole } = render(MealPage);
    await tick();
    await tick();
    expect(queryByRole('button', { name: 'Více' })).not.toBeInTheDocument();
  });

  it('renders the ⋯ overflow when editing an existing meal', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchWithBrambory() : { ok: true, data: null }),
    );
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    expect(await findByRole('button', { name: 'Více' })).toBeInTheDocument();
  });

  it('tapping ⋯ opens the confirm sheet with "Smazat jídlo" + "Zrušit"', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchWithBrambory() : { ok: true, data: null }),
    );
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    await fireEvent.click(await findByRole('button', { name: 'Více' }));
    await tick();
    expect(getByRole('button', { name: 'Smazat jídlo' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Zrušit' })).toBeInTheDocument();
  });

  it('tapping "Zrušit" in the confirm sheet closes it', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchWithBrambory() : { ok: true, data: null }),
    );
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
  // (`discardDescriptor('delete')`) and the e2e specs in
  // `tests/e2e/meal-delete.test.ts`.

  it('empty-meal hint visible when editing an existing meal with zero foods', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchWithBrambory() : { ok: true, data: null }),
    );
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
    // Default beforeEach: empty slot — composing-new.
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    await tick();
    expect(queryByText(/aspoň jednu položku/)).not.toBeInTheDocument();
  });
  // ── Issue #277: dirty-aware CTA label/state (rendering only) ──────────
  // The CTA's `Uložit změny` label and its enabled/disabled rendering are
  // asserted here. The discard-buffer wiring + save-call lifecycle behind
  // these states is covered by `meal-editor.test.ts` (`discardDescriptor` /
  // `dirty` / `canFinalize` / `finalize`) and by the e2e specs
  // (`meal-dirty-discard.test.ts`, `meal-save.test.ts`).

  function lunchSavedAtFixedTime() {
    return {
      ok: true,
      data: {
        id: '2025-06-13:lunch',
        date: '2025-06-13',
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'portion' }],
        createdAt: '2025-06-13T08:00:00.000Z',
      },
    };
  }

  it('finalize CTA reads "Uložit změny" (disabled) when editing a clean existing meal', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchSavedAtFixedTime() : { ok: true, data: null }),
    );
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole } = render(MealPage);
    // Wait for hydration.
    const cta = await findByRole('button', { name: 'Uložit změny' });
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('aria-disabled')).toBe('true');
  });

  it('finalize CTA "Uložit změny" becomes enabled once the user dirties the meal (notes change)', async () => {
    setReady();
    mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
    mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
      Promise.resolve(mealType === 'lunch' ? lunchSavedAtFixedTime() : { ok: true, data: null }),
    );
    const { default: MealPage } = await import('./+page.svelte');
    const { findByRole, getByRole } = render(MealPage);
    await findByRole('button', { name: 'Uložit změny' });
    // Type into the notes textarea — that flips dirty=true.
    const notes = getByRole('textbox', { name: /Poznámka/ });
    await fireEvent.input(notes, { target: { value: 'něco poznámka' } });
    await tick();
    const cta = getByRole('button', { name: 'Uložit změny' });
    expect(cta.getAttribute('aria-disabled')).toBe('false');
  });

  // ── Working-list amount + preparation rendering (#279) ─────
  describe('working-list amount + preparation suffix', () => {
    function lunchWithSpoonBrambory() {
      return {
        ok: true,
        data: {
          id: '2025-06-13:lunch',
          date: '2025-06-13',
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'spoon' }],
          createdAt: new Date().toISOString(),
        },
      };
    }
    function lunchWithSpoonBramboryBoiled() {
      return {
        ok: true,
        data: {
          id: '2025-06-13:lunch',
          date: '2025-06-13',
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'i1', name: 'Brambory', foodId: 'potato', amount: 'spoon', preparationMethod: 'boiled' }],
          createdAt: new Date().toISOString(),
        },
      };
    }

    it('confirmed-food row renders Czech portion label "Lžíce" — not raw key, not short form', async () => {
      setReady();
      mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
      mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
        Promise.resolve(mealType === 'lunch' ? lunchWithSpoonBrambory() : { ok: true, data: null }),
      );
      const { default: MealPage } = await import('./+page.svelte');
      const { container } = render(MealPage);
      await tick();
      await tick();

      const row = container.querySelector('[data-food-tile]');
      expect(row).not.toBeNull();
      const text = row!.textContent ?? '';
      expect(text).toMatch(/Lžíce/);
      // Must not show the raw key 'spoon' or the short form 'lžíce' (lowercase).
      expect(text).not.toMatch(/\bspoon\b/);
      expect(text).not.toMatch(/\blžíce\b/);
    });

    it('confirmed-food row appends "· {preparation label}" only when preparationMethod is set', async () => {
      setReady();
      mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
      mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
        Promise.resolve(mealType === 'lunch' ? lunchWithSpoonBramboryBoiled() : { ok: true, data: null }),
      );
      const { default: MealPage } = await import('./+page.svelte');
      const { container } = render(MealPage);
      await tick();
      await tick();

      const row = container.querySelector('[data-food-tile]');
      const text = row!.textContent ?? '';
      expect(text).toMatch(/Lžíce\s*·\s*Vařené/);
    });

    it('confirmed-food row omits the "·" separator when no preparation is set', async () => {
      setReady();
      mockPage.url = new URL('http://localhost/meal?type=lunch&date=2025-06-13&returnTo=/day/2025-06-13');
      mockLoadBySlot.mockImplementation((_d: string, mealType: string) =>
        Promise.resolve(mealType === 'lunch' ? lunchWithSpoonBrambory() : { ok: true, data: null }),
      );
      const { default: MealPage } = await import('./+page.svelte');
      const { container } = render(MealPage);
      await tick();
      await tick();

      const row = container.querySelector('[data-food-tile]');
      const text = row!.textContent ?? '';
      expect(text).not.toMatch(/·/);
    });
  });

  // ── Issue #302: unified 3-style typography on meal screen ───────
  // User stories 11+12 of #297: section headers, date, banners share one
  // type rhythm; the date in top-right reads as quiet meta (caption), not
  // body content. Section headers carry the consolidated `eyebrow` utility.

  describe('typography (issue #302)', () => {
    it('"Všechny kategorie" section header carries the eyebrow utility', async () => {
      setReady();
      const { default: MealPage } = await import('./+page.svelte');
      const { getByText } = render(MealPage);
      await tick();
      const header = getByText('Všechny kategorie');
      expect(header.classList.contains('eyebrow')).toBe(true);
    });

    it('"Přidané potraviny" section header carries the eyebrow utility', async () => {
      setReady();
      const { default: MealPage } = await import('./+page.svelte');
      const { getByRole, getByText } = render(MealPage);
      await tick();
      // Confirm a food so the working-list section appears.
      await fireEvent.click(getByRole('button', { name: /Mléko/ }));
      await tick();
      await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
      await tick();
      await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
      await tick();
      await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
      await tick();
      const header = getByText('Přidané potraviny');
      expect(header.classList.contains('eyebrow')).toBe(true);
    });

    it('"Poznámka" section header carries the eyebrow utility', async () => {
      setReady();
      const { default: MealPage } = await import('./+page.svelte');
      const { container } = render(MealPage);
      await tick();
      const label = container.querySelector('label[for="meal-notes"]');
      expect(label).not.toBeNull();
      expect(label!.classList.contains('eyebrow')).toBe(true);
    });

    it('date in the top-right carries the larger body-muted utility, not the tiny caption', async () => {
      setReady();
      mockPage.url = new URL(`http://localhost/meal?type=lunch&date=${today}&returnTo=/day/${today}`);
      const { default: MealPage } = await import('./+page.svelte');
      const { container } = render(MealPage);
      await tick();
      // The date string appears next to the page header; locate by Czech-format pattern.
      const candidates = [...container.querySelectorAll('p, span')].filter(el =>
        /^\d+\.\s\S+/.test(el.textContent?.trim() ?? ''),
      );
      expect(candidates.length).toBeGreaterThan(0);
      // The header date is bumped up to body-muted for legibility (no longer caption).
      for (const el of candidates) {
        expect(el.classList.contains('body-muted')).toBe(true);
        expect(el.classList.contains('caption')).toBe(false);
      }
    });


  });
});
