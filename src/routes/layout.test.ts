import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';
import { writable } from 'svelte/store';

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { db } from '$lib/db/atopic-db';
import type { GeneratedSchedule, Meal, QuestionnaireAnswers } from '$lib/domain/models';
import { mealId } from '$lib/domain/models';
import { type WorkingMeal, emptyWorkingMeal } from '$lib/domain/working-meal';
import { clearBuffer, discardBuffer, writeBuffer } from '$lib/stores/discard-buffer';
import type { ScheduleContext } from '$lib/stores/schedule-context';

const meals = new DexieMealRepository(db, new DexieScheduleRepository(db));

const mockGoto = vi.fn();
const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });
const mockPageStore = writable({
  url: new URL(`http://localhost/day/${new Date().toISOString().split('T')[0]}`),
  params: { date: new Date().toISOString().split('T')[0] },
  data: {},
});

vi.mock('$app/navigation', () => ({ goto: mockGoto }));
vi.mock('$app/stores', () => ({ page: { subscribe: mockPageStore.subscribe } }));
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));

/** Extract the numeric value from a Tailwind `z-N` (or `z-[N]`) utility class. */
function zIndexOf(el: Element | null): number {
  if (!el) return 0;
  for (const cls of Array.from(el.classList)) {
    const m = cls.match(/^z-(?:\[(\d+)\]|(\d+))$/);
    if (m) return Number(m[1] ?? m[2]);
  }
  return 0;
}

const today = new Date().toISOString().split('T')[0]!;

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!,
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
  programStartDate: '2025-06-01',
  completedAt: '2025-06-01T10:00:00.000Z',
  testedAllergens: ['dairy'],
  feedingStage: 'breastfed',
};

const readyContext: ScheduleContext = {
  status: 'ready',
  schedule: sampleSchedule,
  answers: sampleAnswers,
  allergenStatuses: [],
  protocolEliminated: [],
  permanentMother: [],
  permanentBaby: [],
  reintroInfo: null,
  progress: { currentDay: 1, totalDays: 30, percentComplete: 3 },
};

const emptyChildren = createRawSnippet(() => ({ render: () => '<span></span>' }));

async function renderLayout() {
  const { default: Layout } = await import('./+layout.svelte');
  return render(Layout, { props: { children: emptyChildren } });
}

beforeEach(() => {
  mockGoto.mockReset();
  mockScheduleContext.set({ status: 'loading' });
  mockPageStore.set({
    url: new URL(`http://localhost/day/${today}`),
    params: { date: today },
    data: {},
  });
});

describe('+layout.svelte — redirect', () => {
  it('calls goto("/") when answers are null and not on onboarding', async () => {
    mockScheduleContext.set({ status: 'empty' });
    await renderLayout();
    await tick();
    expect(mockGoto).toHaveBeenCalledWith('/');
  });

  it('does not call goto when already on onboarding route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockScheduleContext.set({ status: 'empty' });
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('calls goto("/day/<today>") when status is ready and landing on the root route (issue #353)', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    await renderLayout();
    await tick();
    expect(mockGoto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('does not call goto when status is ready and already on a non-root route', async () => {
    mockScheduleContext.set(readyContext);
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('does not call goto while status is loading, even on the root route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockScheduleContext.set({ status: 'loading' });
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });
});

describe('+layout.svelte — bottom nav visibility', () => {
  it('hides nav when answers are null', async () => {
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('hides nav on onboarding route even when answers are present', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
  });

  it('shows nav with Dnes and Týden tabs when answers are present on a main route', async () => {
    mockScheduleContext.set(readyContext);
    const { getByText } = await renderLayout();
    await tick();
    expect(getByText('Dnes')).toBeInTheDocument();
    expect(getByText('Týden')).toBeInTheDocument();
  });

  it('hides nav on /meal route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/meal'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('hides nav on /settings route', async () => {
    mockPageStore.set({
      url: new URL('http://localhost/settings'),
      params: { date: '' },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('hides nav on /skin route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/skin'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('renders FAB when nav is visible', async () => {
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const fab = container.querySelector('button[aria-label="Přidat záznam"]');
    expect(fab).toBeInTheDocument();
  });

  it('hides FAB when viewing a future /day/[date]', async () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    mockPageStore.set({
      url: new URL(`http://localhost/day/${future}`),
      params: { date: future },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const fab = container.querySelector('button[aria-label="Přidat záznam"]');
    expect(fab).toBeNull();
  });

  it('clicking FAB opens action sheet', async () => {
    mockScheduleContext.set(readyContext);
    const { container, getByText } = await renderLayout();
    await tick();
    const fab = container.querySelector('button[aria-label="Přidat záznam"]') as HTMLButtonElement;
    fab.click();
    await tick();
    expect(getByText('Co chceš přidat?')).toBeInTheDocument();
  });

  it('action sheet uses page date param when on /day/[date]', async () => {
    mockPageStore.set({
      url: new URL('http://localhost/day/2025-01-15'),
      params: { date: '2025-01-15' },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container, getByTestId } = await renderLayout();
    await tick();
    const fab = container.querySelector('button[aria-label="Přidat záznam"]') as HTMLButtonElement;
    fab.click();
    await tick();
    // Tapping `Přidat jídlo` opens the meal-type submenu; picking `Snídaně`
    // navigates with date + returnTo bound to the page's selectedDate.
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-breakfast'));
    await tick();
    expect(mockGoto).toHaveBeenCalledWith(
      '/meal?type=breakfast&date=2025-01-15&returnTo=/day/2025-01-15',
    );
  });
});

describe('+layout.svelte — FAB stacking (issue #324)', () => {
  const sampleWorkingMeal: WorkingMeal = { families: [], notes: '' };

  beforeEach(() => {
    discardBuffer.set(null);
  });

  function fabButton(container: HTMLElement): HTMLButtonElement | null {
    return container.querySelector('button[aria-label="Přidat záznam"]');
  }

  it('FAB sits above the discard toast when both are visible', async () => {
    mockScheduleContext.set(readyContext);
    discardBuffer.set({
      kind: 'meal-compose',
      workingMeal: sampleWorkingMeal,
      mealType: 'breakfast',
      actor: 'mother',
      date: today,
      returnTo: `/day/${today}`,
    });

    const { container, getByRole } = await renderLayout();
    await tick();

    const fab = fabButton(container);
    const toast = getByRole('alert');
    expect(fab).not.toBeNull();
    expect(toast).toBeInTheDocument();

    expect(zIndexOf(fab)).toBeGreaterThan(zIndexOf(toast));
  });

  it('FAB sits above the bottom navigation it overhangs', async () => {
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();

    const fab = fabButton(container);
    const nav = container.querySelector('nav');
    expect(fab).not.toBeNull();
    expect(nav).not.toBeNull();

    // The nav is the surface the FAB visually lifts above; the FAB must
    // outrank it so its overhanging top edge is never clipped or covered.
    expect(zIndexOf(fab)).toBeGreaterThan(zIndexOf(nav));
  });

  it('action sheet still covers the FAB when opened (modal layer outranks FAB)', async () => {
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();

    const fab = fabButton(container)!;
    fab.click();
    await tick();

    // The FabActionSheet's bottom-sheet panel uses role="dialog".
    const sheet = container.ownerDocument.querySelector('[role="dialog"]');
    expect(sheet).not.toBeNull();

    // Action sheet is allowed to intentionally cover the FAB.
    expect(zIndexOf(sheet)).toBeGreaterThan(zIndexOf(fab));
  });
});

describe('+layout.svelte — active tab state', () => {
  it('Dnes tab links to /day/<today>', async () => {
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector(`a[href="/day/${today}"]`);
    expect(dnesLink).toBeInTheDocument();
    expect(dnesLink?.textContent).toContain('Dnes');
  });

  it('marks Dnes tab active when viewing today', async () => {
    mockPageStore.set({
      url: new URL(`http://localhost/day/${today}`),
      params: { date: today },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector(`a[href="/day/${today}"]`);
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(dnesLink?.classList).toContain('text-primary');
    expect(tydenLink?.classList).toContain('text-text-muted');
  });

  it('marks Dnes tab inactive when viewing a past date', async () => {
    const pastDate = '2025-01-01';
    mockPageStore.set({
      url: new URL(`http://localhost/day/${pastDate}`),
      params: { date: pastDate },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector(`a[href="/day/${today}"]`);
    expect(dnesLink?.classList).toContain('text-text-muted');
  });

  it('marks Dnes tab inactive when viewing a future date', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    mockPageStore.set({
      url: new URL(`http://localhost/day/${futureDate}`),
      params: { date: futureDate },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector(`a[href="/day/${today}"]`);
    expect(dnesLink?.classList).toContain('text-text-muted');
  });

  it('marks Týden tab active on /week', async () => {
    mockPageStore.set({ url: new URL('http://localhost/week'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector(`a[href="/day/${today}"]`);
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(tydenLink?.classList).toContain('text-primary');
    expect(dnesLink?.classList).toContain('text-text-muted');
  });

  it('marks Týden tab active on /program', async () => {
    mockPageStore.set({ url: new URL('http://localhost/program'), params: { date: '' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(tydenLink?.classList).toContain('text-primary');
  });
});

describe('+layout.svelte — scroll reset on navigation (issue #325)', () => {
  // The app shell wraps page content in <main> with `overflow-y-auto`, so the
  // window doesn't scroll — that inner region does. Without an explicit reset,
  // the scroll offset persists across route changes and new pages open
  // mid-scroll. The layout must reset that container to the top on every
  // navigation.
  it('resets the main scroll container to top when the route changes', async () => {
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();

    const main = container.querySelector('main') as HTMLElement;
    expect(main).toBeInTheDocument();

    // Simulate user scrolling down on the current page.
    main.scrollTop = 250;
    expect(main.scrollTop).toBe(250);

    // Navigate to another route — the layout should reset the scroll.
    mockPageStore.set({ url: new URL('http://localhost/week'), params: { date: '' }, data: {} });
    await tick();

    expect(main.scrollTop).toBe(0);
  });

  it('resets scroll when navigating between two day routes', async () => {
    mockPageStore.set({
      url: new URL('http://localhost/day/2025-01-15'),
      params: { date: '2025-01-15' },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();

    const main = container.querySelector('main') as HTMLElement;
    main.scrollTop = 400;

    mockPageStore.set({
      url: new URL('http://localhost/day/2025-01-16'),
      params: { date: '2025-01-16' },
      data: {},
    });
    await tick();

    expect(main.scrollTop).toBe(0);
  });
});

describe('+layout.svelte — discard toast undo', () => {
  beforeEach(() => {
    clearBuffer();
  });

  it("preserves the buffer's original date when undoing a delete on a past day", async () => {
    const pastDate = '2026-06-19';
    mockPageStore.set({
      url: new URL(`http://localhost/day/${pastDate}`),
      params: { date: pastDate },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    writeBuffer({
      kind: 'meal-delete',
      workingMeal: emptyWorkingMeal(),
      mealType: 'breakfast',
      actor: 'mother',
      date: pastDate,
      returnTo: `/day/${pastDate}`,
    });

    const { getByText } = await renderLayout();
    await tick();
    await fireEvent.click(getByText('Zpět'));
    await tick();

    expect(mockGoto).toHaveBeenCalledWith(
      `/meal?type=breakfast&date=${pastDate}&actor=mother&returnTo=${encodeURIComponent(`/day/${pastDate}`)}`,
    );
  });

  it("carries the buffer's actor into the undo URL so a baby undo returns to the baby slot (issue #588)", async () => {
    const date = '2026-06-20';
    mockPageStore.set({
      url: new URL(`http://localhost/day/${date}`),
      params: { date },
      data: {},
    });
    mockScheduleContext.set(readyContext);
    // A baby meal was deleted; the buffer records actor: 'baby'. Without the
    // actor in the undo URL the return navigation defaulted to 'mother' and
    // clobbered the mother's row (the reported dual-actor bug).
    writeBuffer({
      kind: 'meal-delete',
      workingMeal: emptyWorkingMeal(),
      mealType: 'breakfast',
      actor: 'baby',
      date,
      returnTo: `/day/${date}`,
    });

    const { getByText } = await renderLayout();
    await tick();
    await fireEvent.click(getByText('Zpět'));
    await tick();

    expect(mockGoto).toHaveBeenCalledWith(
      `/meal?type=breakfast&date=${date}&actor=baby&returnTo=${encodeURIComponent(`/day/${date}`)}`,
    );
  });
});

describe('+layout.svelte — copy-meal undo (issue #606)', () => {
  const date = today;

  beforeEach(async () => {
    clearBuffer();
    await db.meals.clear();
    mockPageStore.set({
      url: new URL(`http://localhost/day/${date}`),
      params: { date },
      data: {},
    });
    mockScheduleContext.set(readyContext);
  });

  it('shows the "Zkopírováno" toast for a meal-copy descriptor', async () => {
    writeBuffer({
      kind: 'meal-copy',
      destinationSlot: { date, mealType: 'dinner', actor: 'mother' },
      addedItemIds: ['a1'],
      destinationPreexisted: false,
      priorUpdatedAt: undefined,
      date,
      returnTo: `/day/${date}`,
    });
    const { getByText } = await renderLayout();
    await tick();
    expect(getByText('Zkopírováno')).toBeInTheDocument();
  });

  it('undo of a copy into a NEWLY-created slot deletes the created meal', async () => {
    // The copy created (date, dinner, mother) from scratch → undo removes it.
    await meals.save({
      id: mealId(date, 'dinner', 'mother'),
      date,
      mealType: 'dinner',
      actor: 'mother',
      items: [{ id: 'copied-1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      createdAt: `${date}T18:00:00.000Z`,
    });
    writeBuffer({
      kind: 'meal-copy',
      destinationSlot: { date, mealType: 'dinner', actor: 'mother' },
      addedItemIds: ['copied-1'],
      destinationPreexisted: false,
      priorUpdatedAt: undefined,
      date,
      returnTo: `/day/${date}`,
    });

    const { getByText } = await renderLayout();
    await tick();
    await fireEvent.click(getByText('Zpět'));
    await tick();
    await vi.waitFor(async () => {
      const slot = await meals.loadBySlot(date, 'dinner', 'mother');
      expect(slot).toEqual({ ok: true, data: null });
    });
    expect(mockGoto).toHaveBeenCalledWith(`/day/${date}`);
  });

  it('undo of a copy that MERGED into an existing meal trims only the added items and restores prior updatedAt', async () => {
    // The destination pre-existed with one food + a note + an updatedAt; the
    // copy added a second food and re-stamped updatedAt. Undo must remove only
    // the added food, restore the prior updatedAt, and leave prior food + note.
    const priorUpdatedAt = `${date}T09:00:00.000Z`;
    const merged: Meal = {
      id: mealId(date, 'dinner', 'mother'),
      date,
      mealType: 'dinner',
      actor: 'mother',
      items: [
        { id: 'prior-1', name: 'Brambory', foodId: 'brambory', amount: 'portion' },
        { id: 'added-1', name: 'Rýže', foodId: 'ryze', amount: 'portion' },
      ],
      notes: 'dest note',
      createdAt: `${date}T08:00:00.000Z`,
      updatedAt: `${date}T18:00:00.000Z`,
    };
    await meals.save(merged);
    writeBuffer({
      kind: 'meal-copy',
      destinationSlot: { date, mealType: 'dinner', actor: 'mother' },
      addedItemIds: ['added-1'],
      destinationPreexisted: true,
      priorUpdatedAt,
      date,
      returnTo: `/day/${date}`,
    });

    const { getByText } = await renderLayout();
    await tick();
    await fireEvent.click(getByText('Zpět'));
    await tick();
    await vi.waitFor(async () => {
      const slot = await meals.loadBySlot(date, 'dinner', 'mother');
      expect(slot.ok && slot.data).toBeTruthy();
      if (slot.ok && slot.data) {
        expect(slot.data.items.map((i) => i.id)).toEqual(['prior-1']);
        expect(slot.data.notes).toBe('dest note');
        expect(slot.data.updatedAt).toBe(priorUpdatedAt);
      }
    });
  });
});
