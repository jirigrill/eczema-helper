import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const today = new Date().toISOString().split('T')[0];
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: today,
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'reset',
      type: 'reset',
      label: 'Resetovací fáze',
      description: '',
      categoryIds: [],
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
