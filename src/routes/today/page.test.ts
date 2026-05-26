import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));

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
  mockScheduleContext.set({ status: 'loading' });
});

describe('today/+page.svelte', () => {
  it('shows "Program není nastaven" when status is empty', async () => {
    mockScheduleContext.set({ status: 'empty' });
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Program není nastaven. Dokončete dotazník.')).toBeInTheDocument();
  });

  it('shows link to questionnaire when status is empty', async () => {
    mockScheduleContext.set({ status: 'empty' });
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Spustit dotazník →')).toBeInTheDocument();
  });

  it('shows "Program není nastaven" when status is loading', async () => {
    mockScheduleContext.set({ status: 'loading' });
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Program není nastaven. Dokončete dotazník.')).toBeInTheDocument();
  });

  it('shows phase hero when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Resetovací fáze')).toBeInTheDocument();
  });

  it('shows allergen columns (Smím / Vyhýbej se) when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('✓ Smím')).toBeInTheDocument();
    expect(getByText('✗ Vyhýbej se')).toBeInTheDocument();
  });

  it('shows "Žádná omezení" in elimination column when eliminatedToday is empty', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Žádná omezení')).toBeInTheDocument();
  });

  it('shows progress bar when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    const progressBar = container.querySelector('.bg-primary.rounded-full');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows counter row when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Dnes ti chybí stav, foto a jídla.')).toBeInTheDocument();
    expect(getByText('0 / 3')).toBeInTheDocument();
  });

  it('shows all three stub cards when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('shows bottom hint when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText(/Vše zapisuj přes/)).toBeInTheDocument();
  });

  it('stub cards appear in correct order', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    const headings = Array.from(
      container.querySelectorAll('.section-label')
    ).map((el) => el.textContent?.trim());
    const stavIdx = headings.findIndex((t) => t === 'Stav ekzému');
    const fotoIdx = headings.findIndex((t) => t === 'Foto kůže');
    const jidlaIdx = headings.findIndex((t) => t === 'Dnešní jídla');
    expect(stavIdx).toBeLessThan(fotoIdx);
    expect(fotoIdx).toBeLessThan(jidlaIdx);
  });

  it('shows "Program skončil" when no phase matches today', async () => {
    const pastSchedule: GeneratedSchedule = {
      permanentMother: [], permanentBaby: [],
      startDate: '2020-01-01',
      estimatedEndDate: '2020-02-01',
      phases: [
        {
          id: 'reset',
          type: 'reset',
          allergenIds: [],
          startDate: '2020-01-01',
          endDate: '2020-01-05',
        },
      ],
    };
    mockScheduleContext.set({
      ...readyContext,
      schedule: pastSchedule,
      progress: { currentDay: 30, totalDays: 30, percentComplete: 100 },
    });
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Program skončil')).toBeInTheDocument();
  });
});
