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
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const today = new Date().toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  phases: [{
    id: 'elim',
    type: 'elimination',
    label: 'Eliminační fáze',
    description: '',
    categoryIds: ['dairy'],
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

beforeEach(() => {
  mockScheduleContext.set({ status: 'loading' });
});

describe('meal/+page.svelte', () => {
  it('does not show eliminated banner when eliminatedToday is empty', async () => {
    mockScheduleContext.set({
      status: 'ready',
      schedule: sampleSchedule,
      answers: sampleAnswers,
      eliminatedToday: [],
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 14, percentComplete: 7 },
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    expect(queryByText('Dnes vyřazeno:')).not.toBeInTheDocument();
  });

  it('shows eliminated banner when eliminatedToday is non-empty', async () => {
    mockScheduleContext.set({
      status: 'ready',
      schedule: sampleSchedule,
      answers: sampleAnswers,
      eliminatedToday: ['dairy'],
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 14, percentComplete: 7 },
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText('Dnes vyřazeno:')).toBeInTheDocument();
  });

  it('shows reintroInfo banner when reintroInfo is present', async () => {
    mockScheduleContext.set({
      status: 'ready',
      schedule: sampleSchedule,
      answers: sampleAnswers,
      eliminatedToday: [],
      reintroInfo: {
        allergenId: 'dairy',
        dayInPhase: 2,
        totalDays: 4,
        label: 'Malá dávka',
        guidance: 'Zkuste trochu',
        isEvaluationDay: false,
      },
      progress: { currentDay: 1, totalDays: 14, percentComplete: 7 },
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText(/Den 2 z 4/)).toBeInTheDocument();
  });
});
