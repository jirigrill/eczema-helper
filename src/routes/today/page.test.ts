import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers, Meal } from '$lib/domain/models';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));

// jsdom doesn't implement URL.createObjectURL — stub for SkinPhotoCard
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── liveQuery mock ────────────────────────────────────────────
// liveQuery is Dexie's reactive query primitive. We mock it here so the
// today page's meal list can be driven by test data without a real IndexedDB.
// Each test sets liveMeals to control what the query "emits".
let liveMeals: Meal[] = [];
vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    // onMount calls liveQuery(...).subscribe({ next, error }) — observer object form.
    // Returns a subscription object with .unsubscribe(), mirroring real Dexie behaviour.
    liveQuery: vi.fn(() => ({
      subscribe(observer: { next: (v: Meal[]) => void; error?: (e: unknown) => void }) {
        observer.next(liveMeals);
        return { unsubscribe: () => {} };
      },
    })),
  };
});
// Prevent real IndexedDB from opening — liveQuery mock never calls db methods
vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

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
  liveMeals = [];
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

  it('shows skin and meal section labels when status is ready', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  // ── Slice 3d: SkinObservationCard + SkinPhotoCard replace stubs ──

  it('does not render dashed-border EmptyStateCard stubs for skin sections', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    // EmptyStateCard uses a dashed border; after slice 3d, the skin cards must not use it
    const dashedCards = Array.from(
      container.querySelectorAll('.border-dashed')
    );
    // None of the dashed-border elements should carry a skin section label
    const skinLabels = ['Stav ekzému', 'Foto kůže'];
    for (const card of dashedCards) {
      for (const label of skinLabels) {
        expect(card.textContent).not.toContain(label);
      }
    }
  });

  it('SkinObservationCard and SkinPhotoCard are rendered on the today page', async () => {
    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { container } = render(TodayPage);
    await tick();
    // Both cards use a solid (not dashed) border and carry their section label
    const allLabels = Array.from(container.querySelectorAll('.section-label'))
      .map((el) => el.textContent?.trim());
    expect(allLabels).toContain('Stav ekzému');
    expect(allLabels).toContain('Foto kůže');
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

  // ── Slice 2e: live meal list ──────────────────────────────

  it('renders a committed meal returned by the live query', async () => {
    const testMeal: Meal = {
      id: `${today}:lunch`,
      date: today,
      mealType: 'lunch',
      actor: 'mother',
      items: [
        { id: 'item-1', name: 'Brambory', allergenId: null, amount: 'portion' },
      ],
      createdAt: `${today}T12:00:00.000Z`,
    };
    liveMeals = [testMeal];

    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();

    // Meal type label visible
    expect(getByText('Oběd')).toBeInTheDocument();
    // Item chip visible
    expect(getByText('Brambory')).toBeInTheDocument();
  });

  it('shows empty-state for meals when live query returns no meals', async () => {
    liveMeals = [];

    mockScheduleContext.set(readyContext);
    const { default: TodayPage } = await import('./+page.svelte');
    const { getByText } = render(TodayPage);
    await tick();

    expect(getByText('Zatím žádný záznam.')).toBeInTheDocument();
  });
});
