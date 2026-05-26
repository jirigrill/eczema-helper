import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';
import { getAllergenStatuses } from '$lib/domain/allergen-status';
import { getEliminatedSlugsForDate, getReintroductionDayInfo } from '$lib/domain/schedule-queries';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const today = new Date().toISOString().split('T')[0];
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'reset',
      type: 'reset',
      allergenIds: [],
      startDate: today,
      endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    },
  ],
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

const readyContext: ScheduleContext = {
  status: 'ready',
  schedule: sampleSchedule,
  answers: sampleAnswers,
  allergenStatuses: [],
  eliminatedToday: [],
  reintroInfo: null,
  progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
};

beforeEach(() => {
  vi.useFakeTimers();
  mockScheduleContext.set({ status: 'loading' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('program/+page.svelte', () => {
  it('shows "Nejprve dokončete dotazník." when status is empty', async () => {
    mockScheduleContext.set({ status: 'empty' });
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();
    expect(getByText('Nejprve dokončete dotazník.')).toBeInTheDocument();
  });

  it('shows "Nejprve dokončete dotazník." when status is loading', async () => {
    mockScheduleContext.set({ status: 'loading' });
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();
    expect(getByText('Nejprve dokončete dotazník.')).toBeInTheDocument();
  });

  it('shows current phase label when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getAllByText } = render(ProgramPage);
    await tick();
    expect(getAllByText('Resetovací fáze').length).toBeGreaterThan(0);
  });

  it('shows progress percentage when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();
    expect(getByText('3%')).toBeInTheDocument();
  });

  it('shows toast message after clicking Upravit program', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText, getByRole } = render(ProgramPage);
    await tick();
    getByText('Upravit program').click();
    await tick();
    expect(getByRole('alert')).toHaveTextContent('Tato funkce bude dostupná brzy');
  });

  it('toast disappears after its duration', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText, queryByRole } = render(ProgramPage);
    await tick();
    getByText('Upravit program').click();
    await tick();
    vi.advanceTimersByTime(5000);
    await tick();
    expect(queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ScheduleContext allergenStatuses consistency', () => {
  it('allergenStatuses forbidden-status ids match eliminatedToday (non-reset phase)', () => {
    const scheduleWithDairy: GeneratedSchedule = {
      permanentMother: [], permanentBaby: [],
      startDate: today, estimatedEndDate: futureDate,
      phases: [{
        id: 'elim', type: 'elimination',
        allergenIds: ['dairy'], startDate: today, endDate: futureDate,
      }],
    };
    const statuses = getAllergenStatuses(scheduleWithDairy, today);
    const eliminated = getEliminatedSlugsForDate(scheduleWithDairy, today);

    expect(statuses).toContainEqual({ allergenId: 'dairy', status: 'eliminated' });

    const forbiddenIds = statuses
      .filter(s => ['permanent-mother', 'permanent-baby', 'eliminated', 'reacted', 'not-yet-tested'].includes(s.status))
      .map(s => s.allergenId)
      .sort();
    expect([...eliminated].sort()).toEqual(forbiddenIds);
  });
});

// ── date helper used in regression schedule ────────────────────────────────
const d = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];

// Schedule: dairy reacted (reintro → rest, both done), eggs currently being reintroduced
const reactedSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: d(-20), estimatedEndDate: d(10),
  phases: [
    { id: 'elim', type: 'elimination', allergenIds: ['dairy', 'eggs'], startDate: d(-20), endDate: d(-11) },
    { id: 'reintro-dairy', type: 'reintroduction', allergenIds: ['dairy'], startDate: d(-10), endDate: d(-7) },
    { id: 'rest', type: 'rest', allergenIds: [], startDate: d(-6), endDate: d(-3) },
    { id: 'reintro-eggs', type: 'reintroduction', allergenIds: ['eggs'], startDate: d(-2), endDate: d(3) },
  ],
};

describe('program timeline — regression: reacted allergen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hero card shows reacted allergen as "reagovalo", not "✓ znovuzavedena"', async () => {
    // Verify domain precondition: dairy IS reacted on today (we're in eggs reintro phase)
    const statuses = getAllergenStatuses(reactedSchedule, today);
    expect(statuses.find(s => s.allergenId === 'dairy')?.status).toBe('reacted');

    const reactedCtx: ScheduleContext = {
      status: 'ready',
      schedule: reactedSchedule,
      answers: sampleAnswers,
      allergenStatuses: statuses,
      eliminatedToday: getEliminatedSlugsForDate(reactedSchedule, today),
      reintroInfo: getReintroductionDayInfo(reactedSchedule, today),
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    };

    mockScheduleContext.set(reactedCtx);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { queryByText } = render(ProgramPage);
    await tick();

    // Bug: old getAllergenStatusRows shows dairy as "✓ znovuzavedena" (reintroduced)
    expect(queryByText('✓ znovuzavedena')).not.toBeInTheDocument();
    // Fix: allergenStatuses-driven display shows "reagovalo"
    expect(queryByText('reagovalo')).toBeInTheDocument();
  });
});

// ── Cycle 3 & 4: permanent allergen sections ──────────────────────────────

describe('program timeline — permanent allergen sections', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Maminčiny alergeny" section when schedule has mother allergens', async () => {
    const scheduleWithMother: GeneratedSchedule = {
      permanentMother: ['dairy'],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: futureDate,
      phases: [{ id: 'reset', type: 'reset', allergenIds: [], startDate: today, endDate: futureDate }],
    };
    const ctx: ScheduleContext = {
      status: 'ready',
      schedule: scheduleWithMother,
      answers: sampleAnswers,
      allergenStatuses: getAllergenStatuses(scheduleWithMother, today),
      eliminatedToday: getEliminatedSlugsForDate(scheduleWithMother, today),
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    };
    mockScheduleContext.set(ctx);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();
    expect(getByText('Maminčiny alergeny')).toBeInTheDocument();
  });

  it('does not show "Maminčiny alergeny" when no mother allergens', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { queryByText } = render(ProgramPage);
    await tick();
    expect(queryByText('Maminčiny alergeny')).not.toBeInTheDocument();
  });

  it('shows "Potvrzené alergie miminka" section when schedule has baby allergens', async () => {
    const scheduleWithBaby: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: ['eggs'],
      startDate: today,
      estimatedEndDate: futureDate,
      phases: [{ id: 'reset', type: 'reset', allergenIds: [], startDate: today, endDate: futureDate }],
    };
    const ctx: ScheduleContext = {
      status: 'ready',
      schedule: scheduleWithBaby,
      answers: { ...sampleAnswers, babyConfirmedAllergies: ['eggs'] },
      allergenStatuses: getAllergenStatuses(scheduleWithBaby, today),
      eliminatedToday: getEliminatedSlugsForDate(scheduleWithBaby, today),
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    };
    mockScheduleContext.set(ctx);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();
    expect(getByText('Potvrzené alergie miminka')).toBeInTheDocument();
  });

  it('does not show "Potvrzené alergie miminka" when no baby allergens', async () => {
    mockScheduleContext.set(readyContext);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { queryByText } = render(ProgramPage);
    await tick();
    expect(queryByText('Potvrzené alergie miminka')).not.toBeInTheDocument();
  });
});
