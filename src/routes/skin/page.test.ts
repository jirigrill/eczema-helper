import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

// ── Schedule context mock ─────────────────────────────────────
const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// ── SkinObservationRepository mock ───────────────────────────
const mockSave = vi.fn().mockResolvedValue({ ok: true, data: undefined });
vi.mock('$lib/adapters/dexie-skin-observation-repository', () => ({
  DexieSkinObservationRepository: vi.fn().mockImplementation(() => ({
    save: mockSave,
    listByDate: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  })),
}));
vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

// ── Mutable page mock — lets tests control ?date= and ?returnTo= ──
const mockPage = { url: new URL('http://localhost/skin') };
vi.mock('$app/state', () => ({ page: mockPage }));

const today = new Date().toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  phases: [{
    id: 'elim',
    type: 'elimination',
    allergenIds: ['dairy'],
    startDate: today,
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  }],
};

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: today,
  completedAt: new Date().toISOString(),
  testedAllergens: ['dairy'],
};

function setReady(overrides: Partial<Omit<Extract<ScheduleContext, { status: 'ready' }>, 'status'>> = {}) {
  mockScheduleContext.set({
    status: 'ready',
    schedule: sampleSchedule,
    answers: sampleAnswers,
    allergenStatuses: [],
    eliminatedToday: [],
    reintroInfo: null,
    progress: { currentDay: 1, totalDays: 14, percentComplete: 7 },
    ...overrides,
  });
}

beforeEach(() => {
  mockScheduleContext.set({ status: 'loading' });
  mockSave.mockClear();
  mockPage.url = new URL('http://localhost/skin');
});

describe('skin/+page.svelte', () => {
  // ── Issue spec: Tier 1 tests ──────────────────────────────

  it('tapping "Uložit" with a status selected calls SkinObservationRepository.save', async () => {
    setReady();
    const { default: SkinPage } = await import('./+page.svelte');
    const { getByText } = render(SkinPage);
    await tick();

    // Select a status
    await fireEvent.click(getByText('Zlepšení'));
    await tick();

    // Click Uložit
    await fireEvent.click(getByText('Uložit hodnocení'));
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const saved = mockSave.mock.calls[0][0];
    expect(saved.status).toBe('improved');
    expect(saved.date).toBe(today);
  });

  it('"Uložit" is disabled without a status selected', async () => {
    setReady();
    const { default: SkinPage } = await import('./+page.svelte');
    const { queryByText } = render(SkinPage);
    await tick();

    // The save button only appears after selecting a status in EczemaCheck
    expect(queryByText('Uložit hodnocení')).not.toBeInTheDocument();
  });

  it('reintro context pill renders when reintroductionAllergenId is set', async () => {
    setReady({
      reintroInfo: { allergenId: 'dairy', dayInPhase: 2, totalDays: 4, isEvaluationDay: false },
    });
    const { default: SkinPage } = await import('./+page.svelte');
    const { getByText } = render(SkinPage);
    await tick();

    // EczemaCheck renders the allergen watch pill with this text pattern
    expect(getByText(/Sledujte reakci na/)).toBeInTheDocument();
  });

  // ── Navigation: returnTo ──────────────────────────────────

  it('after save, goto is called with /today when no returnTo param', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: SkinPage } = await import('./+page.svelte');
    const { getByText } = render(SkinPage);
    await tick();

    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    await fireEvent.click(getByText('Uložit hodnocení'));
    await tick();

    expect(goto).toHaveBeenCalledWith('/today');
  });

  it('after save, goto is called with custom returnTo when param is present', async () => {
    mockPage.url = new URL('http://localhost/skin?returnTo=/program');
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: SkinPage } = await import('./+page.svelte');
    const { getByText } = render(SkinPage);
    await tick();

    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    await fireEvent.click(getByText('Uložit hodnocení'));
    await tick();

    expect(goto).toHaveBeenCalledWith('/program');
  });

  // ── ?date= param defaults to today ───────────────────────

  it('saved observation uses today when no ?date= param', async () => {
    setReady();
    const { default: SkinPage } = await import('./+page.svelte');
    const { getByText } = render(SkinPage);
    await tick();

    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    await fireEvent.click(getByText('Uložit hodnocení'));
    await tick();

    const saved = mockSave.mock.calls[0][0];
    expect(saved.date).toBe(today);
  });
});
