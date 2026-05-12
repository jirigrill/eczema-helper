import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { GeneratedSchedule } from '$lib/domain/models';

const mockScheduleStore = writable<GeneratedSchedule | null>(null);

vi.mock('$lib/stores/schedule', () => ({
  scheduleStore: { subscribe: mockScheduleStore.subscribe },
}));

const today = new Date().toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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

beforeEach(() => {
  mockScheduleStore.set(null);
});

describe('today/+page.svelte', () => {
  it('shows "Program není nastaven" when schedule is null', async () => {
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Program není nastaven. Dokončete dotazník.')).toBeInTheDocument();
  });

  it('shows link to questionnaire when schedule is null', async () => {
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Spustit dotazník →')).toBeInTheDocument();
  });

  it('shows phase hero when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Resetovací fáze')).toBeInTheDocument();
  });

  it('shows allergen columns (Smím / Vyhýbej se) when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('✓ Smím')).toBeInTheDocument();
    expect(getByText('✗ Vyhýbej se')).toBeInTheDocument();
  });

  it('shows "Žádná omezení" in elimination column during reset phase', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Žádná omezení')).toBeInTheDocument();
  });

  it('shows progress bar when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    const progressBar = container.querySelector('.bg-primary.rounded-full');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows counter row when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Dnes ti chybí stav, foto a jídla.')).toBeInTheDocument();
    expect(getByText('0 / 3')).toBeInTheDocument();
  });

  it('shows all three stub cards when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('shows bottom hint when schedule is present', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText(/Vše zapisuj přes/)).toBeInTheDocument();
  });

  it('Foto kůže stub appears between Stav ekzému and Dnešní jídla', async () => {
    mockScheduleStore.set(sampleSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    const headings = Array.from(
      container.querySelectorAll('.text-\\[10px\\].uppercase')
    ).map((el) => el.textContent?.trim());
    const stavIdx = headings.findIndex((t) => t === 'Stav ekzému');
    const fotoIdx = headings.findIndex((t) => t === 'Foto kůže');
    const jidlaIdx = headings.findIndex((t) => t === 'Dnešní jídla');
    expect(stavIdx).toBeLessThan(fotoIdx);
    expect(fotoIdx).toBeLessThan(jidlaIdx);
  });

  it('shows "Program skončil" when no phase matches today', async () => {
    const pastSchedule: GeneratedSchedule = {
      permanentEliminations: [],
      startDate: '2020-01-01',
      estimatedEndDate: '2020-02-01',
      phases: [
        {
          id: 'reset',
          type: 'reset',
          label: 'Resetovací fáze',
          description: '',
          categoryIds: [],
          startDate: '2020-01-01',
          endDate: '2020-01-05',
        },
      ],
    };
    mockScheduleStore.set(pastSchedule);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Program skončil')).toBeInTheDocument();
  });
});
