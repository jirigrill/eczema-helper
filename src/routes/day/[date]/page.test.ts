import { tick } from 'svelte';
import { get, writable } from 'svelte/store';

import { fireEvent, render } from '@testing-library/svelte';
import type * as Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Meal, SkinObservation, SkinPhoto } from '$lib/domain/models';

// ── Navigation mock ───────────────────────────────────────────
const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

// ── page mock — controls page.params.date ────────────────────
const mockPage = { params: { date: '2025-06-01' } };
vi.mock('$app/state', () => ({ page: mockPage }));

const mockSettings = writable<{ feedingStage: 'breastfed' | 'mixed' | 'solids' } | null>({
  feedingStage: 'breastfed',
});
vi.mock('$lib/stores/settings-context', () => ({
  settingsContext: { subscribe: mockSettings.subscribe },
}));

// ── liveQuery mock ────────────────────────────────────────────
// Each session subscribes to a different table via createDateScopedSession.
// The mock identifies the table by tag (set by the db mock below) and emits
// the matching fixture array.
let liveMeals: Meal[] = [];
let liveObservations: SkinObservation[] = [];
let livePhotos: SkinPhoto[] = [];

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof Dexie>();
  return {
    ...actual,
    liveQuery: vi.fn((queryFn: () => { __tag?: string } | Promise<unknown>) => {
      return {
        subscribe(observer: { next: (v: unknown) => void; error?: (e: unknown) => void }) {
          let result: { __tag?: string } | Promise<unknown>;
          try {
            result = queryFn();
          } catch {
            observer.next([]);
            return { unsubscribe: () => {} };
          }
          // The earliest-logged store's queryFn is async and resolves to a
          // string | null; route it by promise rather than by tag.
          if (result instanceof Promise) {
            result.then((v) => observer.next(v)).catch(() => observer.error?.(null));
            return { unsubscribe: () => {} };
          }
          const tag = result.__tag;
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
// the liveQuery mock can route emissions per session. `orderBy('date').first()`
// backs the earliest-logged store — it returns the earliest fixture row.
const earliestOf = <T extends { date: string }>(rows: T[]): T | undefined =>
  rows.length === 0 ? undefined : [...rows].sort((a, b) => a.date.localeCompare(b.date))[0];
const tagged = (tag: string, rows: () => { date: string }[]) => ({
  where: () => ({
    equals: () => ({ toArray: () => ({ __tag: tag }) }),
  }),
  orderBy: () => ({ first: () => Promise.resolve(earliestOf(rows())) }),
});
vi.mock('$lib/db/atopic-db', () => ({
  db: {
    meals: tagged('meals', () => liveMeals),
    skin_observations: tagged('observations', () => liveObservations),
    photos: tagged('photos', () => []),
  },
}));

// skin-photo-session factory is consumed by day-view.svelte.ts; mock it to
// emit livePhotos so the day-view completeness counter stays testable.
vi.mock('$lib/stores/skin-photo-session', () => ({
  createSkinPhotoSession: (_date: string) => ({
    subscribe: (cb: (v: SkinPhoto[]) => void) => {
      cb(livePhotos);
      return () => {};
    },
  }),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── Fixtures ─────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]!;
const pastDate = '2025-06-01';
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;

beforeEach(() => {
  mockGoto.mockReset();
  mockSettings.set({ feedingStage: 'breastfed' });
  mockPage.params.date = pastDate;
  liveMeals = [];
  liveObservations = [];
  livePhotos = [];
});

describe('/day/[date] page', () => {
  describe('historical past date', () => {
    it('renders meal card section for a past date', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      // MealCard renders its label
      expect(getByText('Dnešní jídla')).toBeInTheDocument();
    });

    it('renders skin observation card for a past date', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { getByText } = render(DayPage);
      await tick();
      expect(getByText('Stav ekzému')).toBeInTheDocument();
    });

    it('renders day strip for a past date', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('day-strip')).toBeInTheDocument();
    });

    it('does not render a Dnes pill on past dates (it was removed)', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('dnes-pill')).toBeNull();
    });
  });

  describe('today-only chrome', () => {
    it('does not show Dnes pill when selected date is today (Dnes pill is removed)', async () => {
      mockPage.params.date = today;
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('dnes-pill')).toBeNull();
    });
  });

  describe('back-to-today chip (PRD #623, §3c)', () => {
    it('renders the "↩ Dnes" chip in the header off today', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      const chip = getByTestId('back-to-today-chip');
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toContain('↩ Dnes');
    });

    it('does not render the chip when the selected date is today', async () => {
      mockPage.params.date = today;
      const { default: DayPage } = await import('./+page.svelte');
      const { queryByTestId } = render(DayPage);
      await tick();
      expect(queryByTestId('back-to-today-chip')).toBeNull();
    });

    it('navigates to /day/<today> when tapped', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      await fireEvent.click(getByTestId('back-to-today-chip'));
      expect(mockGoto).toHaveBeenCalledWith(`/day/${today}`);
    });

    it('pulses the recentre signal when tapped so the strip jumps back to today', async () => {
      mockPage.params.date = pastDate;
      const { dayStripRecentreSignal } = await import('$lib/stores/day-strip-recentre');
      dayStripRecentreSignal.set(0);
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      const before = get(dayStripRecentreSignal);
      await fireEvent.click(getByTestId('back-to-today-chip'));
      expect(get(dayStripRecentreSignal)).toBe(before + 1);
    });
  });

  describe('header de-duplication', () => {
    it('shows "Dnes" heading and date-only eyebrow on today', async () => {
      mockPage.params.date = today;
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();

      const heading = container.querySelector('h2.page-heading');
      expect(heading?.textContent?.trim()).toBe('Dnes');

      const eyebrow = container.querySelector('.eyebrow');
      const eyebrowText = eyebrow?.textContent ?? '';
      // Eyebrow on today shows the date only — no weekday, no divider.
      expect(eyebrowText).not.toContain('·');
      expect(eyebrowText.toLowerCase()).not.toMatch(
        /pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle/,
      );
    });

    it('shows the date exactly once in the header on a non-today day', async () => {
      // Use a fixed past date so the long-format date is deterministic ("1. června").
      mockPage.params.date = pastDate;
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
      const { default: DayPage } = await import('./+page.svelte');
      const { container } = render(DayPage);
      await tick();
      const headerBlock = container.querySelector('h2.page-heading')?.parentElement;
      const headerText = (headerBlock?.textContent ?? '').toLowerCase();
      expect(headerText).not.toMatch(/pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle/);
    });
  });

  describe('redirect on invalid param', () => {
    it('redirects a future date to today (no future logging)', async () => {
      mockPage.params.date = futureDate;
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('/day/'),
        expect.objectContaining({ replaceState: true }),
      );
    });

    it('calls goto with today when param is a malformed string', async () => {
      mockPage.params.date = 'not-a-date';
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('/day/'),
        expect.objectContaining({ replaceState: true }),
      );
    });

    it('does NOT call goto when param is a valid past date', async () => {
      mockPage.params.date = pastDate;
      const { default: DayPage } = await import('./+page.svelte');
      render(DayPage);
      await tick();
      expect(mockGoto).not.toHaveBeenCalled();
    });
  });
});

describe('/day/[date] page — content (ported from today/page.test.ts)', () => {
  it('renders no task-counter row on today (parked: daily-completeness)', async () => {
    mockPage.params.date = today;
    const { default: DayPage } = await import('./+page.svelte');
    const { queryByTestId } = render(DayPage);
    await tick();
    expect(queryByTestId('task-counter')).toBeNull();
  });

  it('the day-strip today marker carries no record state, whatever is logged', async () => {
    mockPage.params.date = pastDate;
    liveMeals = [
      {
        id: `${today}:lunch:mother`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [
          {
            id: 'i1',
            name: 'Rýže',
            foodId: 'rice:rice' as Meal['items'][number]['foodId'],
            amount: 'portion',
          },
        ],
        createdAt: `${today}T12:00:00.000Z`,
      },
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByTestId } = render(DayPage);
    await tick();
    expect(getByTestId('day-strip-today-ring')).not.toHaveAttribute('data-recorded');
  });

  it('shows skin and meal section labels when schedule is ready', async () => {
    mockPage.params.date = today;
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
    expect(getByText('Foto kůže')).toBeInTheDocument();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('does not render dashed-border stubs for skin sections', async () => {
    mockPage.params.date = today;
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
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText(/Vše zapisuj přes/)).toBeInTheDocument();
  });

  it('section cards appear in order: Stav ekzému → Foto kůže → Dnešní jídla', async () => {
    mockPage.params.date = today;
    const { default: DayPage } = await import('./+page.svelte');
    const { container } = render(DayPage);
    await tick();
    const allEls = Array.from(container.querySelectorAll('*'));
    const idx = (label: string) => {
      const el = allEls.find((e) => e.textContent?.trim() === label);
      return el ? allEls.indexOf(el) : -1;
    };
    expect(idx('Stav ekzému')).toBeLessThan(idx('Foto kůže'));
    expect(idx('Foto kůže')).toBeLessThan(idx('Dnešní jídla'));
  });

  it('renders a committed meal returned by liveQuery', async () => {
    mockPage.params.date = today;
    liveMeals = [
      {
        id: `${today}:lunch:mother`,
        date: today,
        mealType: 'lunch',
        actor: 'mother',
        items: [{ id: 'item-1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
        createdAt: `${today}T12:00:00.000Z`,
      } satisfies Meal,
    ];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByText } = render(DayPage);
    await tick();
    expect(getByText('Oběd')).toBeInTheDocument();
    expect(getByText('Brambory')).toBeInTheDocument();
  });

  it('shows all four unlogged meal slots when liveQuery returns no meals', async () => {
    mockPage.params.date = today;
    liveMeals = [];
    const { default: DayPage } = await import('./+page.svelte');
    const { getByTestId, queryByText } = render(DayPage);
    await tick();
    expect(getByTestId('meal-row-breakfast')).toBeInTheDocument();
    expect(getByTestId('meal-row-lunch')).toBeInTheDocument();
    expect(getByTestId('meal-row-snack')).toBeInTheDocument();
    expect(getByTestId('meal-row-dinner')).toBeInTheDocument();
    expect(queryByText('Zatím žádný záznam.')).not.toBeInTheDocument();
  });

  // ── #570: dual-actor day-view slot projection ──────────────────────────────

  describe('dual-actor meal slots (#570)', () => {
    it('mixed stage: a slot with both actors logged renders per-actor rows', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'mixed' });
      liveMeals = [
        {
          id: `${today}:lunch:mother`,
          date: today,
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
        {
          id: `${today}:lunch:baby`,
          date: today,
          mealType: 'lunch',
          actor: 'baby',
          items: [{ id: 'b1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
          createdAt: `${today}T12:30:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-actor-row-mother').textContent).toMatch(/Rýže/);
      expect(getByTestId('meal-actor-row-baby').textContent).toMatch(/Brambory/);
    });

    it('mixed stage: one actor empty shows a "+" on that row, "›" on the logged row', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'mixed' });
      liveMeals = [
        {
          id: `${today}:lunch:mother`,
          date: today,
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-actor-row-mother').textContent).toMatch(/›/);
      expect(getByTestId('meal-actor-row-baby').textContent).toMatch(/\+/);
    });

    // ── #584: tapping an actor row carries that actor into the meal editor ──
    // In the mixed stage both actors are eligible, so the meal link must name
    // the tapped actor via `?actor=`; otherwise the editor seeds `mother` and
    // opens the wrong meal regardless of which row was tapped.

    it('mixed stage: a filled actor row links to its own actor slot', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'mixed' });
      liveMeals = [
        {
          id: `${today}:lunch:mother`,
          date: today,
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
        {
          id: `${today}:lunch:baby`,
          date: today,
          mealType: 'lunch',
          actor: 'baby',
          items: [{ id: 'b1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
          createdAt: `${today}T12:30:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-actor-row-baby').getAttribute('href')).toMatch(/actor=baby/);
      expect(getByTestId('meal-actor-row-mother').getAttribute('href')).toMatch(/actor=mother/);
    });

    it('mixed stage: an empty actor row links to that empty actor slot', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'mixed' });
      liveMeals = [
        {
          id: `${today}:lunch:mother`,
          date: today,
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-actor-row-baby').getAttribute('href')).toMatch(/actor=baby/);
    });

    it('breastfed stage: the slot collapses to a single row with no actor sub-rows', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'breastfed' });
      liveMeals = [
        {
          id: `${today}:lunch:mother`,
          date: today,
          mealType: 'lunch',
          actor: 'mother',
          items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId, queryByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-row-lunch').textContent).toMatch(/Rýže/);
      expect(queryByTestId('meal-actor-row-mother')).toBeNull();
      expect(queryByTestId('meal-actor-row-baby')).toBeNull();
    });

    it('solids stage: the slot collapses to a single row driven by the baby-only eligible set', async () => {
      mockPage.params.date = today;
      mockSettings.set({ feedingStage: 'solids' });
      liveMeals = [
        {
          id: `${today}:lunch:baby`,
          date: today,
          mealType: 'lunch',
          actor: 'baby',
          items: [{ id: 'b1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
          createdAt: `${today}T12:00:00.000Z`,
        } satisfies Meal,
      ];
      const { default: DayPage } = await import('./+page.svelte');
      const { getByTestId, queryByTestId } = render(DayPage);
      await tick();
      expect(getByTestId('meal-row-lunch').textContent).toMatch(/Brambory/);
      expect(queryByTestId('meal-actor-row-mother')).toBeNull();
      expect(queryByTestId('meal-actor-row-baby')).toBeNull();
    });
  });
});
