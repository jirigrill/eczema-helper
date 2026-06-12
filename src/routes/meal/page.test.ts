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
    expect(queryByText(/Mléko/)).toBeInTheDocument();
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

  // ── Eliminated allergen banners preserved ────────────────

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
});
