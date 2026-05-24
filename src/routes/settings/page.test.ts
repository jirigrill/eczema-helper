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
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  phases: [{
    id: 'reset',
    type: 'reset',
    label: 'Resetovací fáze',
    description: '',
    categoryIds: [],
    startDate: today,
    endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
  }],
};

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-06-15',
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

describe('settings/+page.svelte', () => {
  it('shows "Dotazník ještě nebyl vyplněn." when status is empty', async () => {
    mockScheduleContext.set({ status: 'empty' });
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await tick();
    expect(getByText('Dotazník ještě nebyl vyplněn.')).toBeInTheDocument();
  });

  it('shows "Dotazník ještě nebyl vyplněn." when status is loading', async () => {
    mockScheduleContext.set({ status: 'loading' });
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await tick();
    expect(getByText('Dotazník ještě nebyl vyplněn.')).toBeInTheDocument();
  });

  it('shows answers summary when status is ready', async () => {
    mockScheduleContext.set({
      status: 'ready',
      schedule: sampleSchedule,
      answers: sampleAnswers,
      eliminatedToday: [],
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    });
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await tick();
    expect(getByText('Aktuální konfigurace')).toBeInTheDocument();
  });

  it('shows severity label when status is ready', async () => {
    mockScheduleContext.set({
      status: 'ready',
      schedule: sampleSchedule,
      answers: sampleAnswers,
      eliminatedToday: [],
      reintroInfo: null,
      progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
    });
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await tick();
    expect(getByText('Střední')).toBeInTheDocument();
  });
});
