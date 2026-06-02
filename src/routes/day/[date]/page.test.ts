import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

// ── Navigation mock ───────────────────────────────────────────
const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

// ── page mock — controls page.params.date ────────────────────
const mockPage = { params: { date: '2025-06-01' } };
vi.mock('$app/state', () => ({ page: mockPage }));

// ── scheduleRaw mock ─────────────────────────────────────────
const mockScheduleRaw = writable<ScheduleRaw>({ status: 'loading' });
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleRaw: { subscribe: mockScheduleRaw.subscribe },
}));

// ── liveQuery mock ────────────────────────────────────────────
// Kept for beforeEach reset; drives mock liveQuery responses indirectly.

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    liveQuery: vi.fn((_queryFn: () => unknown) => {
      // Determine which table is being queried by inspecting the mock calls.
      // We return a subscription that immediately emits the matching live data.
      return {
        subscribe(observer: { next: (v: unknown[]) => void; error?: (e: unknown) => void }) {
          // Each session store passes a different query to liveQuery; we can't
          // easily inspect which table at mock time, so we push all three arrays.
          // Real isolation is tested at integration/e2e level.
          observer.next([]);
          return { unsubscribe: () => {} };
        },
      };
    }),
  };
});

vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── Fixtures ─────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const pastDate = '2025-06-01';
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: '2025-05-01',
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'reset',
      type: 'reset',
      allergenIds: [],
      startDate: '2025-05-01',
      endDate: '2025-05-05',
    },
    {
      id: 'elim',
      type: 'elimination',
      allergenIds: ['dairy' as const],
      startDate: '2025-05-06',
      endDate: futureDate,
    },
  ],
};

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: '2025-05-01',
  completedAt: '2025-05-01T00:00:00.000Z',
  testedAllergens: ['dairy'],
};

const readyRaw: ScheduleRaw = {
  status: 'ready',
  schedule: sampleSchedule,
  answers: sampleAnswers,
};

const trainingSchedule: GeneratedSchedule = {
  ...sampleSchedule,
  phases: [
    ...sampleSchedule.phases,
    {
      id: 'training-dairy',
      type: 'tolerance-building',
      allergenIds: ['dairy' as const],
      startDate: today,
      endDate: '',
    },
  ],
};

beforeEach(() => {
  mockGoto.mockReset();
  mockScheduleRaw.set({ status: 'loading' });
  mockPage.params.date = pastDate;
});

describe('/day/[date] page', () => {
  describe('historical past date', () => {
    it('renders meal card section for a past date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      // MealCard renders its label
      expect(getByText('Dnešní jídla')).toBeInTheDocument();
    });

    it('renders skin observation card for a past date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      expect(getByText('Stav ekzému')).toBeInTheDocument();
    });

    it('renders week strip for a past date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('week-strip')).toBeInTheDocument();
    });

    it('shows Dnes pill when selected date is not today', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('dnes-pill')).toBeInTheDocument();
    });
  });

  describe('today-only chrome', () => {
    it('shows task counter when selectedDate is today', async () => {
      mockPage.params.date = today;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('task-counter')).toBeInTheDocument();
    });

    it('hides task counter when selectedDate is a past date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('task-counter')).toBeNull();
    });

    it('shows no tolerance reminders for a past date (no tolerance-building phase active then)', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set({ status: 'ready', schedule: trainingSchedule, answers: sampleAnswers });
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();
      // tolerance-building phase starts today, so querying pastDate should yield none
      const reminders = container.querySelectorAll('[data-testid="tolerance-reminder"]');
      expect(reminders).toHaveLength(0);
    });

    it('does not show Dnes pill when selected date is today', async () => {
      mockPage.params.date = today;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('dnes-pill')).toBeNull();
    });
  });

  describe('redirect on invalid param', () => {
    it('calls goto with today when param is a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).toHaveBeenCalledWith(expect.stringContaining('/day/'), expect.objectContaining({ replaceState: true }));
    });

    it('calls goto with today when param is a malformed string', async () => {
      mockPage.params.date = 'not-a-date';
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).toHaveBeenCalledWith(expect.stringContaining('/day/'), expect.objectContaining({ replaceState: true }));
    });

    it('calls goto when param is before protocol start', async () => {
      mockPage.params.date = '2020-01-01';
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).toHaveBeenCalledWith(expect.stringContaining('/day/'), expect.objectContaining({ replaceState: true }));
    });

    it('does NOT call goto when param is a valid in-range date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).not.toHaveBeenCalled();
    });
  });

  describe('loading/empty state', () => {
    it('shows no-program message when schedule is not ready', async () => {
      mockScheduleRaw.set({ status: 'empty' });
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      expect(getByText('Program není nastaven. Dokončete dotazník.')).toBeInTheDocument();
    });
  });
});
