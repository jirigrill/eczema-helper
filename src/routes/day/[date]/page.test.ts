import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type {
  GeneratedSchedule,
  QuestionnaireAnswers,
  Meal,
  SkinObservation,
  SkinPhoto,
} from '$lib/domain/models';

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
// Each session subscribes to a different table via createDateScopedSession.
// The mock identifies the table by tag (set by the db mock below) and emits
// the matching fixture array.
let liveMeals: Meal[] = [];
let liveObservations: SkinObservation[] = [];
let livePhotos: SkinPhoto[] = [];

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    liveQuery: vi.fn((queryFn: () => { __tag?: string }) => {
      return {
        subscribe(observer: { next: (v: unknown[]) => void; error?: (e: unknown) => void }) {
          let tag: string | undefined;
          try { tag = queryFn().__tag; } catch { /* ignore */ }
          if (tag === 'observations') observer.next(liveObservations);
          else if (tag === 'photos') observer.next(livePhotos);
          else observer.next(liveMeals);
          return { unsubscribe: () => {} };
        },
      };
    }),
  };
});

// Each table returns a chain whose .toArray() carries an identifying tag, so
// the liveQuery mock can route emissions per session.
const tagged = (tag: string) => ({
  where: () => ({
    equals: () => ({ toArray: () => ({ __tag: tag }) }),
  }),
});
vi.mock('$lib/db/atopic-db', () => ({
  db: {
    meals: tagged('meals'),
    skin_observations: tagged('observations'),
    photos: tagged('photos'),
  },
}));

// skin-photo-session factory is consumed by day-view.svelte.ts; mock it to
// emit livePhotos so the day-view completeness counter stays testable.
vi.mock('$lib/stores/skin-photo-session', () => ({
  createSkinPhotoSession: (_date: string) => ({
    subscribe: (cb: (v: SkinPhoto[]) => void) => { cb(livePhotos); return () => {}; },
  }),
}));

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

// Schedule that covers today — needed for content tests that assert today-specific UI.
const todaySchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'reset',
      type: 'reset',
      allergenIds: [],
      startDate: today,
      endDate: futureDate,
    },
  ],
};

const todayAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: today,
  completedAt: new Date().toISOString(),
  testedAllergens: ['dairy'],
};

const readyRawToday: ScheduleRaw = {
  status: 'ready',
  schedule: todaySchedule,
  answers: todayAnswers,
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

// Training schedule rooted at today so tolerance reminders fire.
const trainingScheduleToday: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: futureDate,
  phases: [
    {
      id: 'training-dairy',
      type: 'tolerance-building',
      allergenIds: ['dairy' as const],
      startDate: today,
      endDate: futureDate,
    },
  ],
};

beforeEach(() => {
  mockGoto.mockReset();
  mockScheduleRaw.set({ status: 'loading' });
  mockPage.params.date = pastDate;
  liveMeals = [];
  liveObservations = [];
  livePhotos = [];
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

    it('renders day strip for a past date', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('day-strip')).toBeInTheDocument();
    });

    it('does not render a Dnes pill on past dates (it was removed)', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('dnes-pill')).toBeNull();
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

    it('does not show Dnes pill when selected date is today (Dnes pill is removed)', async () => {
      mockPage.params.date = today;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('dnes-pill')).toBeNull();
    });
  });

  describe('header de-duplication', () => {
    it('shows "Dnes" heading and date-only eyebrow on today', async () => {
      mockPage.params.date = today;
      mockScheduleRaw.set(readyRawToday);
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();

      const heading = container.querySelector('h2.page-heading');
      expect(heading?.textContent?.trim()).toBe('Dnes');

      const eyebrow = container.querySelector('.eyebrow');
      const eyebrowText = eyebrow?.textContent ?? '';
      // Eyebrow on today shows the date only — no weekday, no divider.
      expect(eyebrowText).not.toContain('·');
      expect(eyebrowText.toLowerCase()).not.toMatch(/pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle/);
    });

    it('shows the date exactly once in the header on a non-today day', async () => {
      // Use a fixed past date so the long-format date is deterministic ("1. června").
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();

      const headerBlock = container.querySelector('h2.page-heading')?.parentElement;
      expect(headerBlock).toBeTruthy();
      const headerText = headerBlock?.textContent ?? '';

      const occurrences = headerText.split('1. června').length - 1;
      expect(occurrences).toBe(1);

      // Heading carries the date; no eyebrow on non-today days.
      const heading = container.querySelector('h2.page-heading');
      expect(heading?.textContent ?? '').toContain('1. června');

      const eyebrow = container.querySelector('.eyebrow');
      expect(eyebrow).toBeNull();
    });

    it('omits the weekday entirely on a non-today day', async () => {
      mockPage.params.date = pastDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();
      const headerBlock = container.querySelector('h2.page-heading')?.parentElement;
      const headerText = (headerBlock?.textContent ?? '').toLowerCase();
      expect(headerText).not.toMatch(/pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle/);
    });
  });

  describe('redirect on invalid param', () => {
    it('does NOT redirect for a future date — renders preview view', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).not.toHaveBeenCalled();
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

  describe('future-day preview', () => {
    it('renders the "Naplánováno" badge on a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      expect(getByText('Naplánováno')).toBeInTheDocument();
    });

    it('does NOT render skin observation card on a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByText } = render(DayPage);
      await tick();
      expect(queryByText('Stav ekzému')).toBeNull();
    });

    it('does NOT render skin photo card on a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByText } = render(DayPage);
      await tick();
      expect(queryByText('Foto kůže')).toBeNull();
    });

    it('does NOT render meal card on a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByText } = render(DayPage);
      await tick();
      expect(queryByText('Dnešní jídla')).toBeNull();
    });

    it('does NOT render the bottom record-hint on a future date', async () => {
      mockPage.params.date = futureDate;
      mockScheduleRaw.set(readyRaw);
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByText } = render(DayPage);
      await tick();
      expect(queryByText(/Vše zapisuj přes/)).toBeNull();
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

describe('/day/[date] page — content (ported from today/page.test.ts)', () => {
  it('shows phase hero when schedule is ready', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Resetovací fáze')).toBeInTheDocument();
  });

  it('shows allergen columns (Smím / Vyhýbej se) when schedule is ready', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('✓ Smím')).toBeInTheDocument();
    expect(getByText('✗ Vyhýbej se')).toBeInTheDocument();
  });

  it('shows "Žádná omezení" in elimination column when nothing is eliminated', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Žádná omezení')).toBeInTheDocument();
  });

  it('shows progress bar when schedule is ready', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    expect(container.querySelector('.bg-primary.rounded-full')).toBeInTheDocument();
  });

  it('shows counter row when viewing today', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Dnes ti chybí stav, foto a jídla.')).toBeInTheDocument();
    expect(getByText('0 / 3')).toBeInTheDocument();
  });

  it('counter reflects records: 1 / 3 when only a meal with content is logged', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    liveMeals = [
      {
        id: `${today}:lunch`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'i1', name: 'Rýže', foodId: 'rice:rice' as Meal['items'][number]['foodId'], amount: 'portion' }],
        createdAt: `${today}T12:00:00.000Z`,
      },
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('1 / 3')).toBeInTheDocument();
  });

  it('counter reflects records: 3 / 3 when skin observation, photo, and meal are all logged', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    liveMeals = [
      {
        id: `${today}:lunch`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'i1', name: 'Rýže', foodId: 'rice:rice' as Meal['items'][number]['foodId'], amount: 'portion' }],
        createdAt: `${today}T12:00:00.000Z`,
      },
    ];
    liveObservations = [
      {
        id: 'o1',
        date: today,
        createdAt: `${today}T08:00:00.000Z`,
        regions: [{ id: 'face', level: 1 }],
      },
    ];
    livePhotos = [
      {
        id: 'p1',
        observationId: 'obs-1',
        region: 'face' as const,
        capturedAt: `${today}T08:00:00.000Z`,
        blob: new Blob(),
      },
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('3 / 3')).toBeInTheDocument();
  });

  it('counter does not count an empty meal slot (no items, no notes)', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    liveMeals = [
      {
        id: `${today}:breakfast`,
        date: today,
        mealType: 'breakfast',
        actor: 'mother',
        items: [],
        createdAt: `${today}T08:00:00.000Z`,
      },
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('0 / 3')).toBeInTheDocument();
  });

  it('shows skin and meal section labels when schedule is ready', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('does not render dashed-border stubs for skin sections', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    const dashedCards = Array.from(container.querySelectorAll('.border-dashed'));
    for (const card of dashedCards) {
      expect(card.textContent).not.toContain('Stav ekzému');
      expect(card.textContent).not.toContain('Foto kůže');
    }
  });

  it('SkinObservationCard and SkinPhotoCard are rendered', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    // Seed a matching observation + photo so the overlay time (H:MM derived
    // from the observation's local createdAt) reaches the DOM. Building the
    // ISO string from a local Date keeps the assertion timezone-independent.
    const createdAt = new Date(2026, 4, 15, 9, 12).toISOString();
    liveObservations = [
      {
        id: 'obs-morning',
        date: today,
        createdAt,
        regions: [],
      },
    ];
    livePhotos = [
      {
        id: 'photo-1',
        observationId: 'obs-morning',
        region: 'face',
        capturedAt: createdAt,
        blob: new Blob(['img'], { type: 'image/jpeg' }),
      },
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText, getByTestId } = render(DayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByTestId('skin-photo-caption').textContent).toBe('Tváře · 9:12');
  });

  it('shows bottom hint when schedule is ready', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText(/Vše zapisuj přes/)).toBeInTheDocument();
  });

  it('section cards appear in order: Stav ekzému → Foto kůže → Dnešní jídla', async () => {
    mockPage.params.date = today;
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    const allEls = Array.from(container.querySelectorAll('*'));
    const idx = (label: string) => {
      const el = allEls.find(e => e.textContent?.trim() === label);
      return el ? allEls.indexOf(el) : -1;
    };
    expect(idx('Stav ekzému')).toBeLessThan(idx('Foto kůže'));
    expect(idx('Foto kůže')).toBeLessThan(idx('Dnešní jídla'));
  });

  it('shows "Program skončil" when no phase matches the selected date', async () => {
    mockPage.params.date = today;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const pastOnlySchedule: GeneratedSchedule = {
      permanentMother: [], permanentBaby: [],
      startDate: yesterday,
      estimatedEndDate: yesterday,
      phases: [
        { id: 'reset', type: 'reset', allergenIds: [], startDate: yesterday, endDate: yesterday },
      ],
    };
    mockScheduleRaw.set({ status: 'ready', schedule: pastOnlySchedule, answers: { ...todayAnswers, programStartDate: yesterday } });
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Program skončil')).toBeInTheDocument();
  });

  it('renders a committed meal returned by liveQuery', async () => {
    mockPage.params.date = today;
    liveMeals = [
      {
        id: `${today}:lunch`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'item-1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
        createdAt: `${today}T12:00:00.000Z`,
      } satisfies Meal,
    ];
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Oběd')).toBeInTheDocument();
    expect(getByText('Brambory')).toBeInTheDocument();
  });

  it('shows all four unlogged meal slots when liveQuery returns no meals', async () => {
    mockPage.params.date = today;
    liveMeals = [];
    mockScheduleRaw.set(readyRawToday);
    const { default: DayPage } = await import('./+page.svelte');
    const { getByTestId, queryByText } = render(DayPage);
    await tick();
    expect(getByTestId('meal-row-breakfast')).toBeInTheDocument();
    expect(getByTestId('meal-row-lunch')).toBeInTheDocument();
    expect(getByTestId('meal-row-snack')).toBeInTheDocument();
    expect(getByTestId('meal-row-dinner')).toBeInTheDocument();
    expect(queryByText('Zatím žádný záznam.')).not.toBeInTheDocument();
  });

  it('shows tolerance reminder when training phase is active and allergen never dosed', async () => {
    mockPage.params.date = today;
    liveMeals = [];
    mockScheduleRaw.set({ status: 'ready', schedule: trainingScheduleToday, answers: todayAnswers });
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    expect(container.querySelectorAll('[data-testid="tolerance-reminder"]')).toHaveLength(1);
  });

  it('shows reminder label "Trénink tolerance" when reminder is active', async () => {
    mockPage.params.date = today;
    liveMeals = [];
    mockScheduleRaw.set({ status: 'ready', schedule: trainingScheduleToday, answers: todayAnswers });
    const { default: DayPage } = await import('./+page.svelte');
    const { getAllByText } = render(DayPage);
    await tick();
    expect(getAllByText('Trénink tolerance').length).toBeGreaterThan(0);
  });

  it('shows no reminder when training allergen was dosed today', async () => {
    mockPage.params.date = today;
    liveMeals = [
      {
        id: `${today}:lunch`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'i1', name: 'Mléko', foodId: 'kravske-mleko', amount: 'portion' }],
        createdAt: `${today}T12:00:00.000Z`,
      } satisfies Meal,
    ];
    mockScheduleRaw.set({ status: 'ready', schedule: trainingScheduleToday, answers: todayAnswers });
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    expect(container.querySelectorAll('[data-testid="tolerance-reminder"]')).toHaveLength(0);
  });

  it('shows no tolerance reminder when no training phase is active', async () => {
    mockPage.params.date = today;
    liveMeals = [];
    mockScheduleRaw.set(readyRawToday); // reset phase only, no tolerance-building
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    expect(container.querySelectorAll('[data-testid="tolerance-reminder"]')).toHaveLength(0);
  });
});
