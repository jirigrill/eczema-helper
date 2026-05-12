import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';
import type { QuestionnaireAnswers } from '$lib/domain/models';

const mockGoto = vi.fn();
const mockQuestionnaireStore = writable<QuestionnaireAnswers | null>(null);
const mockPageStore = writable({ url: new URL('http://localhost/today'), params: {}, data: {} });

vi.mock('$app/navigation', () => ({ goto: mockGoto }));
vi.mock('$app/stores', () => ({ page: { subscribe: mockPageStore.subscribe } }));
vi.mock('$lib/stores/questionnaire', () => ({
  questionnaireStore: { subscribe: mockQuestionnaireStore.subscribe },
}));

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: '2025-06-01',
  completedAt: '2025-06-01T10:00:00.000Z',
  testedAllergens: ['dairy'],
};

const emptyChildren = createRawSnippet(() => ({ render: () => '<span></span>' }));

async function renderLayout() {
  const { default: Layout } = await import('./+layout.svelte');
  return render(Layout, { props: { children: emptyChildren } });
}

beforeEach(() => {
  mockGoto.mockReset();
  mockQuestionnaireStore.set(null);
  mockPageStore.set({ url: new URL('http://localhost/today'), params: {}, data: {} });
});

describe('+layout.svelte — redirect', () => {
  it('calls goto("/") when answers are null and not on onboarding', async () => {
    mockQuestionnaireStore.set(null);
    await renderLayout();
    await tick();
    expect(mockGoto).toHaveBeenCalledWith('/');
  });

  it('does not call goto when already on onboarding route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: {}, data: {} });
    mockQuestionnaireStore.set(null);
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
    mockPageStore.set({ url: new URL('http://localhost/'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
  });

  it('shows nav with Dnes and Týden tabs when answers are present on a main route', async () => {
    mockQuestionnaireStore.set(sampleAnswers);
    const { getByText } = await renderLayout();
    await tick();
    expect(getByText('Dnes')).toBeInTheDocument();
    expect(getByText('Týden')).toBeInTheDocument();
  });

  it('hides nav on /meal route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/meal'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('hides nav on /settings route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/settings'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
    expect(queryByText('Týden')).not.toBeInTheDocument();
  });

  it('renders FAB when nav is visible', async () => {
    mockQuestionnaireStore.set(sampleAnswers);
    const { container } = await renderLayout();
    await tick();
    const fab = container.querySelector('button[aria-label="Přidat záznam"]');
    expect(fab).toBeInTheDocument();
  });
});

describe('+layout.svelte — active tab state', () => {
  it('marks Dnes tab active on /today', async () => {
    mockPageStore.set({ url: new URL('http://localhost/today'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector('a[href="/today"]');
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(dnesLink?.classList).toContain('text-primary');
    expect(tydenLink?.classList).toContain('text-text-muted');
  });

  it('marks Týden tab active on /week', async () => {
    mockPageStore.set({ url: new URL('http://localhost/week'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { container } = await renderLayout();
    await tick();
    const dnesLink = container.querySelector('a[href="/today"]');
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(tydenLink?.classList).toContain('text-primary');
    expect(dnesLink?.classList).toContain('text-text-muted');
  });

  it('marks Týden tab active on /program', async () => {
    mockPageStore.set({ url: new URL('http://localhost/program'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { container } = await renderLayout();
    await tick();
    const tydenLink = container.querySelector('a[href="/week"]');
    expect(tydenLink?.classList).toContain('text-primary');
  });
});
