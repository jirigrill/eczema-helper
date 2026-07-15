import { tick } from 'svelte';
import { writable } from 'svelte/store';

import { render, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { getAllergenStatuses } from '$lib/domain/allergen-status';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';
import { getEliminatedSlugsForDate, getReintroductionDayInfo } from '$lib/domain/schedule-queries';
import type { ScheduleContext } from '$lib/stores/schedule-context';

const catalog = new BundledCatalogAdapter();

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/protocol-session', () => ({
  protocolSession: {
    subscribe: mockScheduleContext.subscribe,
    startProtocol: vi.fn(),
    appendReTests: vi.fn(),
    removeReTest: vi.fn(),
    reset: vi.fn(),
  },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const today = new Date().toISOString().split('T')[0]!;
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: today,
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'reset',
      type: 'reset',
      allergenIds: [],
      startDate: today,
      endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]!,
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
      permanentMother: [],
      permanentBaby: [],
      startDate: today,
      estimatedEndDate: futureDate,
      phases: [
        {
          id: 'elim',
          type: 'elimination',
          allergenIds: ['dairy'],
          startDate: today,
          endDate: futureDate,
        },
      ],
    };
    const statuses = getAllergenStatuses(scheduleWithDairy, today);
    const eliminated = getEliminatedSlugsForDate(scheduleWithDairy, today);

    expect(statuses).toContainEqual({ allergenId: 'dairy', status: 'eliminated' });

    const forbiddenIds = statuses
      .filter((s) =>
        ['permanent-mother', 'permanent-baby', 'eliminated', 'reacted', 'not-yet-tested'].includes(
          s.status,
        ),
      )
      .map((s) => s.allergenId)
      .sort();
    expect([...eliminated].sort()).toEqual(forbiddenIds);
  });
});

// ── date helper used in regression schedule ────────────────────────────────
const d = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0]!;

// Schedule: dairy reacted (reintro → rest, both done), eggs currently being reintroduced
const reactedSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: d(-20),
  estimatedEndDate: d(10),
  phases: [
    {
      id: 'elim',
      type: 'elimination',
      allergenIds: ['dairy', 'eggs'],
      startDate: d(-20),
      endDate: d(-11),
    },
    {
      id: 'reintro-dairy',
      type: 'reintroduction',
      allergenIds: ['dairy'],
      startDate: d(-10),
      endDate: d(-7),
    },
    { id: 'rest', type: 'rest', allergenIds: [], startDate: d(-6), endDate: d(-3) },
    {
      id: 'reintro-eggs',
      type: 'reintroduction',
      allergenIds: ['eggs'],
      startDate: d(-2),
      endDate: d(3),
    },
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
    expect(statuses.find((s) => s.allergenId === 'dairy')?.status).toBe('reacted');

    const reactedCtx: ScheduleContext = {
      status: 'ready',
      schedule: reactedSchedule,
      answers: sampleAnswers,
      allergenStatuses: statuses,
      eliminatedToday: getEliminatedSlugsForDate(reactedSchedule, today),
      reintroInfo: getReintroductionDayInfo(reactedSchedule, today, catalog),
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
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: today, endDate: futureDate },
      ],
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
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: today, endDate: futureDate },
      ],
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

// ── Retest of a reacted protocol allergen (#354, PRD #208 story #8) ─────────
// A `reacted` protocol allergen must offer the same select → confirm →
// appendReTests affordance as a baby-confirmed allergen. A `passed` allergen
// offers none.

describe('program timeline — retest of reacted protocol allergen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockScheduleContext.set({ status: 'loading' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // dairy reacted (reintro → rest, done); eggs tolerated (reintro → reintro, no rest)
  const mixedVerdictSchedule: GeneratedSchedule = {
    permanentMother: [],
    permanentBaby: [],
    startDate: d(-30),
    estimatedEndDate: d(10),
    phases: [
      {
        id: 'elim',
        type: 'elimination',
        allergenIds: ['dairy', 'eggs'],
        startDate: d(-30),
        endDate: d(-21),
      },
      {
        id: 'reintro-eggs',
        type: 'reintroduction',
        allergenIds: ['eggs'],
        startDate: d(-20),
        endDate: d(-15),
      },
      {
        id: 'reintro-dairy',
        type: 'reintroduction',
        allergenIds: ['dairy'],
        startDate: d(-14),
        endDate: d(-9),
      },
      { id: 'rest', type: 'rest', allergenIds: [], startDate: d(-8), endDate: d(-5) },
    ],
  };

  const buildCtx = (): ScheduleContext => ({
    status: 'ready',
    schedule: mixedVerdictSchedule,
    answers: sampleAnswers,
    allergenStatuses: getAllergenStatuses(mixedVerdictSchedule, today),
    eliminatedToday: getEliminatedSlugsForDate(mixedVerdictSchedule, today),
    reintroInfo: null,
    progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
  });

  // The reacted section is the `.card-base` wrapping the "Alergeny s reakcí" heading.
  const retestSection = (getByText: (t: string) => HTMLElement): HTMLElement => {
    const section = getByText('Alergeny s reakcí').closest('.card-base');
    if (!section) throw new Error('reacted retest section not found');
    return section as HTMLElement;
  };

  it('shows the reacted-allergen retest section with the reacted allergen as a selectable chip', async () => {
    // Domain precondition: dairy reacted, eggs passed.
    const statuses = getAllergenStatuses(mixedVerdictSchedule, today);
    expect(statuses.find((s) => s.allergenId === 'dairy')?.status).toBe('reacted');
    expect(statuses.find((s) => s.allergenId === 'eggs')?.status).toBe('passed');

    mockScheduleContext.set(buildCtx());
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();

    // The reacted allergen (dairy → "Mléčné výrobky") is a selectable button in the section.
    const section = within(retestSection(getByText));
    expect(section.getByRole('button', { name: /Mléčné výrobky/ })).toBeInTheDocument();
  });

  it('does not offer a retest affordance for a passed (tolerated) allergen', async () => {
    mockScheduleContext.set(buildCtx());
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText } = render(ProgramPage);
    await tick();

    // eggs passed → "Vejce" must not be a selectable retest chip in the section.
    const section = within(retestSection(getByText));
    expect(section.queryByRole('button', { name: /Vejce/ })).not.toBeInTheDocument();
  });

  it('selecting a reacted allergen and confirming calls appendReTests with its id', async () => {
    const { protocolSession } = await import('$lib/stores/protocol-session');
    vi.mocked(protocolSession.appendReTests).mockResolvedValue({ ok: true, data: undefined });

    mockScheduleContext.set(buildCtx());
    const { default: ProgramPage } = await import('./+page.svelte');
    const { getByText, getByRole } = render(ProgramPage);
    await tick();

    const section = within(retestSection(getByText));
    section.getByRole('button', { name: /Mléčné výrobky/ }).click();
    await tick();
    // Shared confirm button lives at page level, outside the section.
    getByRole('button', { name: /Přidat testovací fáze/ }).click();
    await tick();

    expect(protocolSession.appendReTests).toHaveBeenCalledWith(['dairy'], today);
  });
});

// ── Reintroduction evaluation prompt (ADR-0023 / PRD #421) ─────────
// The eval-day prompt "Dnes vyhodnoťte celkovou reakci miminka." is gated
// by `reintroInfo.isEvaluationDay`, which `getReintroductionDayInfo` sources
// from `LadderStep.isEvaluationCheckpoint` at the current rung. This test
// pair locks in that gating end-to-end for the program page.

describe('program timeline — reintroduction evaluation prompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // dairy's ladder has isEvaluationCheckpoint: true only on step 6 (breastfed).
  // Day 1 → rung 1 (not checkpoint), day 6 → rung 6 (checkpoint).
  const dairyReintroSchedule = (dayInPhase: number, totalDays: number): GeneratedSchedule => {
    const start = new Date(Date.now() - (dayInPhase - 1) * 86400000).toISOString().split('T')[0]!;
    const end = new Date(Date.now() + (totalDays - dayInPhase) * 86400000)
      .toISOString()
      .split('T')[0]!;
    return {
      permanentMother: [],
      permanentBaby: [],
      startDate: start,
      estimatedEndDate: end,
      phases: [
        {
          id: 'reintro-dairy',
          type: 'reintroduction',
          allergenIds: ['dairy'],
          startDate: start,
          endDate: end,
        },
      ],
    };
  };

  it('shows "Sledujte kůži miminka" on a non-evaluation rung', async () => {
    const schedule = dairyReintroSchedule(1, 6);
    const ctx: ScheduleContext = {
      status: 'ready',
      schedule,
      answers: sampleAnswers,
      allergenStatuses: getAllergenStatuses(schedule, today),
      eliminatedToday: getEliminatedSlugsForDate(schedule, today),
      reintroInfo: getReintroductionDayInfo(schedule, today, catalog),
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    };
    mockScheduleContext.set(ctx);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { queryByText } = render(ProgramPage);
    await tick();
    expect(queryByText(/Sledujte kůži miminka/)).toBeInTheDocument();
    expect(queryByText(/Dnes vyhodnoťte celkovou reakci/)).not.toBeInTheDocument();
  });

  it('shows "Dnes vyhodnoťte celkovou reakci" on the isEvaluationCheckpoint rung', async () => {
    const schedule = dairyReintroSchedule(6, 6);
    const ctx: ScheduleContext = {
      status: 'ready',
      schedule,
      answers: sampleAnswers,
      allergenStatuses: getAllergenStatuses(schedule, today),
      eliminatedToday: getEliminatedSlugsForDate(schedule, today),
      reintroInfo: getReintroductionDayInfo(schedule, today, catalog),
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    };
    mockScheduleContext.set(ctx);
    const { default: ProgramPage } = await import('./+page.svelte');
    const { queryByText } = render(ProgramPage);
    await tick();
    expect(queryByText(/Dnes vyhodnoťte celkovou reakci/)).toBeInTheDocument();
    expect(queryByText(/Sledujte kůži miminka/)).not.toBeInTheDocument();
  });
});
