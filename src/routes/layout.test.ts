import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const mockGoto = vi.fn();
const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });
const mockPageStore = writable({ url: new URL(`http://localhost/day/${new Date().toISOString().split('T')[0]}`), params: { date: new Date().toISOString().split('T')[0] }, data: {} });

vi.mock('$app/navigation', () => ({ goto: mockGoto }));
vi.mock('$app/stores', () => ({ page: { subscribe: mockPageStore.subscribe } }));
vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));

const today = new Date().toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  phases: [{
    id: 'reset', type: 'reset',
    allergenIds: [], startDate: today,
    endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
  }],
};

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: '2025-06-01',
  completedAt: '2025-06-01T10:00:00.000Z',
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

const emptyChildren = createRawSnippet(() => ({ render: () => '<span></span>' }));

async function renderLayout() {
  const { default: Layout } = await import('./+layout.svelte');
  return render(Layout, { props: { children: emptyChildren } });
}

beforeEach(() => {
  mockGoto.mockReset();
  mockScheduleContext.set({ status: 'loading' });
  mockPageStore.set({ url: new URL(`http://localhost/day/${today}`), params: { date: today }, data: {} });
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
    mockPageStore.set({ url: new URL('http://localhost/settings'), params: { date: '' }, data: {} });
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
    mockPageStore.set({ url: new URL('http://localhost/day/2025-01-15'), params: { date: '2025-01-15' }, data: {} });
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
    expect(mockGoto).toHaveBeenCalledWith('/meal?type=breakfast&date=2025-01-15&returnTo=/day/2025-01-15');
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
    mockPageStore.set({ url: new URL(`http://localhost/day/${today}`), params: { date: today }, data: {} });
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
    mockPageStore.set({ url: new URL(`http://localhost/day/${pastDate}`), params: { date: pastDate }, data: {} });
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
    mockPageStore.set({ url: new URL('http://localhost/day/2025-01-15'), params: { date: '2025-01-15' }, data: {} });
    mockScheduleContext.set(readyContext);
    const { container } = await renderLayout();
    await tick();

    const main = container.querySelector('main') as HTMLElement;
    main.scrollTop = 400;

    mockPageStore.set({ url: new URL('http://localhost/day/2025-01-16'), params: { date: '2025-01-16' }, data: {} });
    await tick();

    expect(main.scrollTop).toBe(0);
  });
});
