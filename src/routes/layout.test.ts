import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';
import { writable } from 'svelte/store';

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { db } from '$lib/db/atopic-db';
import type { Meal } from '$lib/domain/models';
import { mealId } from '$lib/domain/models';
import { type WorkingMeal, emptyWorkingMeal } from '$lib/domain/working-meal';
import { clearBuffer, discardBuffer, writeBuffer } from '$lib/stores/discard-buffer';
import type { SeededStatus } from '$lib/stores/settings.svelte';

const meals = new DexieMealRepository(db);

const mockGoto = vi.fn();
const mockSeededStatus = writable<SeededStatus>('loading');
const mockPageStore = writable({
  url: new URL(`http://localhost/day/${new Date().toISOString().split('T')[0]}`),
  params: { date: new Date().toISOString().split('T')[0] },
  data: {},
});

vi.mock('$app/navigation', () => ({ goto: mockGoto }));
vi.mock('$app/stores', () => ({ page: { subscribe: mockPageStore.subscribe } }));
vi.mock('$lib/stores/settings.svelte', () => ({
  seededStatus: { subscribe: mockSeededStatus.subscribe },
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

const emptyChildren = createRawSnippet(() => ({ render: () => '<span></span>' }));

async function renderLayout() {
  const { default: Layout } = await import('./+layout.svelte');
  return render(Layout, { props: { children: emptyChildren } });
}

beforeEach(() => {
  mockGoto.mockReset();
  mockSeededStatus.set('loading');
  mockPageStore.set({
    url: new URL(`http://localhost/day/${today}`),
    params: { date: today },
    data: {},
  });
});

describe('+layout.svelte — redirect', () => {
  it('calls goto("/") when the feeding stage is unset and not on first run', async () => {
    mockSeededStatus.set('unset');
    await renderLayout();
    await tick();
    expect(mockGoto).toHaveBeenCalledWith('/');
  });

  it('does not call goto when already on the first-run route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockSeededStatus.set('unset');
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('calls goto("/day/<today>") when seeded and landing on first run (issue #353)', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockSeededStatus.set('seeded');
    await renderLayout();
    await tick();
    expect(mockGoto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('does not call goto when seeded and already on a non-root route', async () => {
    mockSeededStatus.set('seeded');
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('does not call goto while the seeded signal is still loading, even on first run', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockSeededStatus.set('loading');
    await renderLayout();
    await tick();
    expect(mockGoto).not.toHaveBeenCalled();
  });
});

describe('+layout.svelte — FAB visibility', () => {
  it('hides the FAB when the feeding stage is unset', async () => {
    mockSeededStatus.set('unset');
    // Render off-root so the unset redirect to / does not remove the shell.
    mockPageStore.set({ url: new URL('http://localhost/day/x'), params: { date: 'x' }, data: {} });
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeNull();
  });

  it('hides the FAB on the first-run route even when seeded', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: { date: '' }, data: {} });
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeNull();
  });

  it('shows the FAB when seeded on a day route', async () => {
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeInTheDocument();
  });

  it('hides the FAB on /meal route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/meal'), params: { date: '' }, data: {} });
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeNull();
  });

  it('hides the FAB on /settings route', async () => {
    mockPageStore.set({
      url: new URL('http://localhost/settings'),
      params: { date: '' },
      data: {},
    });
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeNull();
  });

  it('hides the FAB on /skin route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/skin'), params: { date: '' }, data: {} });
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeNull();
  });

  it('renders no bottom navigation bar', async () => {
    mockSeededStatus.set('seeded');
    const { container, queryByText } = await renderLayout();
    await tick();
    // The single-screen shell (PRD #623, §3) has no nav bar and no Týden tab.
    expect(container.querySelector('nav')).toBeNull();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('shows the FAB when viewing a future /day/[date] — no day is suppressed (PRD #623, §3)', async () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    mockPageStore.set({
      url: new URL(`http://localhost/day/${future}`),
      params: { date: future },
      data: {},
    });
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();
    expect(container.querySelector('button[aria-label="Přidat záznam"]')).toBeInTheDocument();
  });

  it('clicking the FAB opens the action sheet', async () => {
    mockSeededStatus.set('seeded');
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
    mockSeededStatus.set('seeded');
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
    mockSeededStatus.set('seeded');
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

  it('action sheet still covers the FAB when opened (modal layer outranks FAB)', async () => {
    mockSeededStatus.set('seeded');
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

describe('+layout.svelte — scroll reset on navigation (issue #325)', () => {
  // The app shell wraps page content in <main> with `overflow-y-auto`, so the
  // window doesn't scroll — that inner region does. Without an explicit reset,
  // the scroll offset persists across route changes and new pages open
  // mid-scroll. The layout must reset that container to the top on every
  // navigation.
  it('resets the main scroll container to top when the route changes', async () => {
    mockSeededStatus.set('seeded');
    const { container } = await renderLayout();
    await tick();

    const main = container.querySelector('main') as HTMLElement;
    expect(main).toBeInTheDocument();

    // Simulate user scrolling down on the current page.
    main.scrollTop = 250;
    expect(main.scrollTop).toBe(250);

    // Navigate to another route — the layout should reset the scroll.
    mockPageStore.set({
      url: new URL('http://localhost/settings'),
      params: { date: '' },
      data: {},
    });
    await tick();

    expect(main.scrollTop).toBe(0);
  });

  it('resets scroll when navigating between two day routes', async () => {
    mockPageStore.set({
      url: new URL('http://localhost/day/2025-01-15'),
      params: { date: '2025-01-15' },
      data: {},
    });
    mockSeededStatus.set('seeded');
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
    mockSeededStatus.set('seeded');
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
    mockSeededStatus.set('seeded');
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
    mockSeededStatus.set('seeded');
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
