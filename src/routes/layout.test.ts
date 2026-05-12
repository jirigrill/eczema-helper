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

describe('+layout.svelte', () => {
  it('hides nav header when answers are null', async () => {
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
  });

  it('hides nav header on onboarding route regardless of answers', async () => {
    mockPageStore.set({ url: new URL('http://localhost/'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { queryByText } = await renderLayout();
    await tick();
    expect(queryByText('Dnes')).not.toBeInTheDocument();
  });

  it('shows nav header when answers are present and not on onboarding', async () => {
    mockQuestionnaireStore.set(sampleAnswers);
    const { getByText } = await renderLayout();
    await tick();
    expect(getByText(/Dnes/)).toBeInTheDocument();
    expect(getByText(/Program/)).toBeInTheDocument();
  });

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

  it('shows back button on /meal route', async () => {
    mockPageStore.set({ url: new URL('http://localhost/meal/log'), params: {}, data: {} });
    mockQuestionnaireStore.set(sampleAnswers);
    const { getByText } = await renderLayout();
    await tick();
    expect(getByText('← Zpět')).toBeInTheDocument();
  });
});
