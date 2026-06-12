import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const mockScheduleRaw = writable<ScheduleRaw>({ status: 'loading' });
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleRaw: { subscribe: mockScheduleRaw.subscribe },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockWriteBuffer = vi.fn();
const mockClearBuffer = vi.fn();
const mockDiscardBuffer = writable<null>(null);
vi.mock('$lib/stores/discard-buffer', () => ({
  get discardBuffer() { return mockDiscardBuffer; },
  writeBuffer: (...args: unknown[]) => mockWriteBuffer(...args),
  clearBuffer: (...args: unknown[]) => mockClearBuffer(...args),
}));

const mockSave = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockLoadBySlot = vi.fn().mockResolvedValue({ ok: true, data: null });
const mockMealSessionStore = writable<import('$lib/domain/models').Meal[]>([]);
vi.mock('$lib/stores/meal-session', () => ({
  mealSession: {
    subscribe: mockMealSessionStore.subscribe,
    save: (...args: unknown[]) => mockSave(...args),
    loadBySlot: (...args: unknown[]) => mockLoadBySlot(...args),
  },
}));
vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

const mockPage = { url: new URL('http://localhost/meal') };
vi.mock('$app/state', () => ({ page: mockPage }));

const mockHarvestReadByKey = vi.fn().mockResolvedValue({ ok: true, data: null });
const mockHarvestUpsert = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockHarvestStore = writable<import('$lib/domain/harvest-candidate').HarvestCandidate[]>([]);
vi.mock('$lib/stores/harvest-candidate-session', () => ({
  harvestCandidateSession: {
    subscribe: mockHarvestStore.subscribe,
    readByKey: (...args: unknown[]) => mockHarvestReadByKey(...args),
    upsert: (...args: unknown[]) => mockHarvestUpsert(...args),
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
  mockSave.mockClear();
  mockLoadBySlot.mockClear();
  mockLoadBySlot.mockResolvedValue({ ok: true, data: null });
  mockPage.url = new URL('http://localhost/meal');
  mockHarvestReadByKey.mockClear();
  mockHarvestReadByKey.mockResolvedValue({ ok: true, data: null });
  mockHarvestUpsert.mockClear();
  mockHarvestStore.set([]);
  mockWriteBuffer.mockClear();
  mockClearBuffer.mockClear();
});

describe('meal/+page.svelte', () => {

  // ── Layout: meal type pills ───────────────────────────────

  it('renders meal type pills with text labels only — no emoji in pill text', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getAllByRole } = render(MealPage);
    await tick();
    const buttons = getAllByRole('button', { name: /Snídaně|Oběd|Svačina|Večeře/ });
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    buttons.forEach(btn => {
      expect(btn.textContent?.trim()).toMatch(/^(Snídaně|Oběd|Svačina|Večeře)$/);
    });
  });

  it('active meal type pill has primary style; inactive pills have muted style', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    const obedBtn = getByRole('button', { name: 'Oběd' });
    expect(obedBtn.className).toContain('chip--active');
    const snidaneBtn = getByRole('button', { name: 'Snídaně' });
    expect(snidaneBtn.className).toContain('chip--muted');
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
    expect(queryByText('Přidat jídlo')).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Přidat jídlo')).not.toBeInTheDocument();
    expect(queryByText('🥛 Mléko')).toBeInTheDocument();
  });

  it('meal type pills hidden while drilled in, visible on grid', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByRole } = render(MealPage);
    await tick();
    expect(queryByRole('button', { name: 'Snídaně' })).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByRole('button', { name: 'Snídaně' })).not.toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(queryByRole('button', { name: 'Snídaně' })).toBeInTheDocument();
  });

  it('eliminated banner hidden while drilled in, visible on grid', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    expect(queryByText('Dnes vyřazeno:')).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(queryByText('Dnes vyřazeno:')).not.toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(queryByText('Dnes vyřazeno:')).toBeInTheDocument();
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
    expect(queryByText('Přidat jídlo')).toBeInTheDocument();
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

  it('CTA reads "Hotovo" on grid with no confirmed foods', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    const cta = getByRole('button', { name: 'Hotovo' });
    expect(cta).toBeInTheDocument();
  });

  it('CTA reads "Hotovo — {Meal}" on grid when confirmed foods exist', async () => {
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
    // Back on grid — button should say "Hotovo — Oběd"
    const cta = getByRole('button', { name: /Hotovo — Oběd/ });
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

  // ── mealSession.save called only on Hotovo ────────────────

  it('confirming a food does NOT call mealSession.save', async () => {
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
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('committing a family does NOT call mealSession.save', async () => {
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
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('"Hotovo" with confirmed foods calls mealSession.save once', async () => {
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
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();
    expect(mockSave).toHaveBeenCalledOnce();
    const saved = mockSave.mock.calls[0][0];
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].name).toBe('Kravské mléko');
  });

  it('"Hotovo" with no confirmed foods does NOT call mealSession.save', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Hotovo' }));
    await tick();
    expect(mockSave).not.toHaveBeenCalled();
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

  it('does not show eliminated banner when eliminatedToday is empty', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    expect(queryByText('Dnes vyřazeno:')).not.toBeInTheDocument();
  });

  it('shows eliminated banner when eliminatedToday is non-empty', async () => {
    setReadyWithElim();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText('Dnes vyřazeno:')).toBeInTheDocument();
  });

  // ── Navigation: back arrow + returnTo ────────────────────

  it('back chevron on grid calls goto with returnTo', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('after save, goto is called with returnTo', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // add + confirm + commit
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();
    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

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

  it('typing a new custom food and clicking Přidat calls harvestCandidateSession.upsert', async () => {
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
    expect(mockHarvestUpsert).toHaveBeenCalledOnce();
    const candidate = mockHarvestUpsert.mock.calls[0][0];
    expect(candidate.normalizedKey).toBe('špenát');
    expect(candidate.rawForms).toContain('Špenát');
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

  it('removing a food from the working list does NOT call mealSession.save', async () => {
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
    const removeBtn = getByRole('button', { name: /Odebrat Kravské mléko|×|✕|remove/i });
    await fireEvent.click(removeBtn);
    await tick();
    expect(mockSave).not.toHaveBeenCalled();
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
    // Click the notes textarea — outside any [data-food-token]
    await fireEvent.click(getByRole('textbox', { name: /Poznámka/ }));
    await tick();
    // Editor collapsed, food still present and confirmed
    expect(queryByText('Množství')).not.toBeInTheDocument();
    expect(getByRole('button', { name: 'Kravské mléko' })).toBeInTheDocument();
    expect(getByRole('button', { name: /Hotovo — Oběd/ })).toBeInTheDocument();
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
    expect(document.querySelectorAll('[data-food-token]').length).toBeGreaterThanOrEqual(2);
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
    const cta = getByRole('button', { name: /Hotovo/ });
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
    const cta = getByRole('button', { name: 'Hotovo' });
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
    const foodTokens = document.querySelectorAll('[data-food-token]');
    const names = [...foodTokens].map(el => el.textContent?.trim() ?? '');
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
    const beforeTokens = [...document.querySelectorAll('[data-food-token]')].map(el => el.textContent?.trim() ?? '');
    // Open editor on Brambory (second item)
    await fireEvent.click(getByRole('button', { name: 'Brambory' }));
    await tick();
    // Capture order after — Brambory must stay at same index
    const afterTokens = [...document.querySelectorAll('[data-food-token]')].map(el => el.textContent?.trim() ?? '');
    const beforeBramborIdx = beforeTokens.findIndex(n => n.includes('Brambory'));
    const afterBramborIdx = afterTokens.findIndex(n => n.includes('Brambory'));
    expect(afterBramborIdx).toBe(beforeBramborIdx);
  });

  // ── Discard guard (issue #247) ───────────────────────────

  it('back on grid with no confirmed foods does NOT call writeBuffer', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(mockWriteBuffer).not.toHaveBeenCalled();
  });

  it('back on grid with no confirmed foods calls goto immediately', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('back on grid with confirmed food writes buffer then navigates', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Add and commit Kravské mléko
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Mléko/ }));
    await tick();
    // Hit back
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(mockWriteBuffer).toHaveBeenCalledOnce();
    const buf = mockWriteBuffer.mock.calls[0][0];
    expect(buf.mealType).toBe('lunch');
    expect(buf.returnTo).toBe(`/day/${today}`);
    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('back on grid after food confirmed but family not committed still writes buffer', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    // Go into drill-in, confirm a food, come back to grid (without committing family)
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Kravské mléko/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Uložit Kravské mléko/ }));
    await tick();
    // Back to grid without committing the family
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    // Back on grid now — working meal has a confirmed food
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();
    expect(mockWriteBuffer).toHaveBeenCalledOnce();
  });
});
