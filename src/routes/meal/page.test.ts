import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const today = new Date().toISOString().split('T')[0];

const sampleSchedule: GeneratedSchedule = {
  permanentMother: [], permanentBaby: [],
  startDate: today,
  estimatedEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  phases: [{
    id: 'elim',
    type: 'elimination',
    allergenIds: ['dairy'],
    startDate: today,
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  }],
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

function setReady(overrides: Partial<Omit<Extract<ScheduleContext, { status: 'ready' }>, 'status'>> = {}) {
  mockScheduleContext.set({
    status: 'ready',
    schedule: sampleSchedule,
    answers: sampleAnswers,
    allergenStatuses: [],
    eliminatedToday: [],
    reintroInfo: null,
    progress: { currentDay: 1, totalDays: 14, percentComplete: 7 },
    ...overrides,
  });
}

beforeEach(() => {
  mockScheduleContext.set({ status: 'loading' });
});

describe('meal/+page.svelte', () => {

  // ── Existing banner tests (preserved) ────────────────────

  it('does not show eliminated banner when eliminatedToday is empty', async () => {
    setReady({ eliminatedToday: [] });
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();
    expect(queryByText('Dnes vyřazeno:')).not.toBeInTheDocument();
  });

  it('shows eliminated banner when eliminatedToday is non-empty', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText('Dnes vyřazeno:')).toBeInTheDocument();
  });

  it('shows reintroInfo banner when reintroInfo is present', async () => {
    setReady({
      reintroInfo: { allergenId: 'dairy', dayInPhase: 2, totalDays: 4, isEvaluationDay: false },
    });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    expect(getByText(/Den 2 z 4/)).toBeInTheDocument();
  });

  // ── Slice 2b: layout re-author ────────────────────────────

  it('renders meal type pills with text labels only — no emoji in pill text', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getAllByRole } = render(MealPage);
    await tick();

    // All four meal type labels must be present as buttons
    const buttons = getAllByRole('button', { name: /Snídaně|Oběd|Svačina|Večeře/ });
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    // Pills must have rounded-full class (text-only pill shape)
    const snidaneBtn = getByRole('button', { name: 'Snídaně' });
    expect(snidaneBtn.className).toContain('rounded-full');

    // Pill text must not contain emoji: no character in surrogate-pair / emoji range
    buttons.forEach(btn => {
      // textContent of a text-only pill should equal the label string
      expect(btn.textContent?.trim()).toMatch(/^(Snídaně|Oběd|Svačina|Večeře)$/);
    });
  });

  it('active meal type pill has primary style; inactive pills have muted style', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    // Default selected is lunch ('Oběd')
    const obedBtn = getByRole('button', { name: 'Oběd' });
    expect(obedBtn.className).toContain('bg-primary');

    const snidaneBtn = getByRole('button', { name: 'Snídaně' });
    expect(snidaneBtn.className).toContain('bg-surface-dark');
  });

  it('does not render a global amount selector section', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();

    // The old amount section label should be gone
    expect(queryByText('Množství')).not.toBeInTheDocument();
    // None of the portion labels should appear as standalone section buttons
    expect(queryByText('Porce')).not.toBeInTheDocument();
  });

  it('renders a single collapsed "Všechny kategorie" accordion row instead of a category grid', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByTestId } = render(MealPage);
    await tick();

    // Accordion row must be present
    const accordionBtn = getByRole('button', { name: /Všechny kategorie/ });
    expect(accordionBtn).toBeInTheDocument();

    // The old 4-col emoji grid should not be rendered (no category grid container)
    expect(queryByTestId('category-grid')).not.toBeInTheDocument();
  });

  it('tapping the accordion row opens the sub-items bottom sheet', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByRole } = render(MealPage);
    await tick();

    // Bottom sheet not visible initially
    expect(queryByRole('dialog')).not.toBeInTheDocument();

    // Tap accordion
    const accordionBtn = getByRole('button', { name: /Všechny kategorie/ });
    await fireEvent.click(accordionBtn);
    await tick();

    // Bottom sheet / category panel now visible
    expect(queryByRole('dialog')).toBeInTheDocument();
  });

  it('renders Hotovo button even when no items are in the meal', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    const hotovo = getByRole('button', { name: 'Hotovo' });
    expect(hotovo).toBeInTheDocument();
  });

  it('Hotovo button is aria-disabled and has muted style when basket is empty', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    const hotovo = getByRole('button', { name: 'Hotovo' });
    expect(hotovo).toHaveAttribute('aria-disabled', 'true');
    expect(hotovo.className).toContain('bg-surface-dark');
    expect(hotovo.className).toContain('text-text-muted');
  });

  it('clicking disabled Hotovo does not save a meal', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryAllByRole } = render(MealPage);
    await tick();

    const hotovo = getByRole('button', { name: 'Hotovo' });
    await fireEvent.click(hotovo);
    await tick();

    // No toast should appear — save did not fire
    expect(queryAllByRole('status').length).toBe(0);
  });

  // ── Slice 2c: rich item cards + notes textarea ───────────

  it('"V tomto jídle" section heading is always rendered, even with empty basket', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();

    expect(getByText('V tomto jídle')).toBeInTheDocument();
  });

  it('shows dashed empty-state card with hint text when basket is empty', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();

    expect(getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeInTheDocument();
  });

  // ── Basket item rendering ─────────────────────────────────

  it('custom food item appears in basket with fallback icon and name; no inline amount select', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, getByText, queryByRole } = render(MealPage);
    await tick();

    // Type a custom food name and submit
    const input = getByPlaceholderText('Název potraviny…');
    await fireEvent.input(input, { target: { value: 'Brambory' } });
    const addBtn = getByRole('button', { name: 'Přidat' });
    await fireEvent.click(addBtn);
    await tick();

    // Item name visible in basket
    expect(getByText('Brambory')).toBeInTheDocument();

    // Fallback icon for allergenId=null
    expect(getByText('🍽️')).toBeInTheDocument();

    // No inline combobox/select for amount — removed in slice 2c
    expect(queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('category sub-item appears in basket with category icon and correct name', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getByText } = render(MealPage);
    await tick();

    // Open category sheet
    const accordionBtn = getByRole('button', { name: /Všechny kategorie/ });
    await fireEvent.click(accordionBtn);
    await tick();

    // Click the Jahody category — has sub-items, opens sub-item panel
    const jahodyCat = getByRole('button', { name: /Jahody/ });
    await fireEvent.click(jahodyCat);
    await tick();

    // Click first sub-item: Čerstvé jahody
    const subItem = getByRole('button', { name: 'Čerstvé jahody' });
    await fireEvent.click(subItem);
    await tick();

    // Sheet closes, item appears in basket
    expect(getByText('Čerstvé jahody')).toBeInTheDocument();

    // Category icon for 'strawberries'
    expect(getByText('🍓')).toBeInTheDocument();
  });

  it('item card subtitle shows amount when preparationMethod is undefined', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, getByText } = render(MealPage);
    await tick();

    const input = getByPlaceholderText('Název potraviny…');
    await fireEvent.input(input, { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    // Subtitle must contain the portion short label; must NOT contain any prep method
    const subtitle = getByText(/porce/i);
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.textContent).not.toMatch(/vařen|dušen|pečen|smažen/i);
  });

  it('conflict item row uses warning styling', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getByText } = render(MealPage);
    await tick();

    // Open category sheet, expand dairy (has sub-items), pick Jogurt
    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléčné/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Jogurt' }));
    await tick();

    // Conflict label "vyřazeno" appears in the basket row
    expect(getByText('vyřazeno')).toBeInTheDocument();

    // The row element should have data-state="warning"
    const row = getByText('vyřazeno').closest('[data-state="warning"]');
    expect(row).toBeInTheDocument();
  });

  it('✕ button removes item from basket; empty-state reappears', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, getByText, queryByText } = render(MealPage);
    await tick();

    const input = getByPlaceholderText('Název potraviny…');
    await fireEvent.input(input, { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    expect(getByText('Brambory')).toBeInTheDocument();

    // Click the ✕ remove button
    const removeBtn = getByRole('button', { name: '✕' });
    await fireEvent.click(removeBtn);
    await tick();

    expect(queryByText('Brambory')).not.toBeInTheDocument();
    // Empty state reappears
    expect(getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeInTheDocument();
  });

  it('notes textarea is hidden when basket is empty, visible when item added', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, queryByRole } = render(MealPage);
    await tick();

    // No textarea when basket is empty
    expect(queryByRole('textbox', { name: /Poznámka k/ })).not.toBeInTheDocument();

    // Add an item
    const input = getByPlaceholderText('Název potraviny…');
    await fireEvent.input(input, { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    // Textarea now visible with label "Poznámka k Oběd" (default is lunch)
    expect(getByRole('textbox', { name: /Poznámka k Oběd/ })).toBeInTheDocument();
  });

  it('"Today\'s saved meals" section is hidden when no meals saved yet', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { queryByText } = render(MealPage);
    await tick();

    expect(queryByText('Dnes uložená jídla')).not.toBeInTheDocument();
  });

  // ── Save flow ─────────────────────────────────────────────

  it('Hotovo button is enabled and has primary style when basket has items', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    const hotovo = getByRole('button', { name: /Hotovo/ });
    expect(hotovo).toHaveAttribute('aria-disabled', 'false');
    expect(hotovo.className).toContain('bg-primary');
  });

  it('saving a meal shows success toast, clears basket, and displays saved meal below', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, getByText, getAllByText } = render(MealPage);
    await tick();

    // Add two items
    const input = getByPlaceholderText('Název potraviny…');
    await fireEvent.input(input, { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();
    await fireEvent.input(input, { target: { value: 'Mrkev' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    // Click Hotovo
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();

    // Success toast visible
    expect(getByRole('alert')).toBeInTheDocument();
    expect(getByText('✓ Jídlo uloženo')).toBeInTheDocument();

    // Basket cleared — empty state reappears
    expect(getByText('Zatím prázdné. Klepni na potravinu výše.')).toBeInTheDocument();

    // Saved meal section appears with the items
    expect(getByText('Dnes uložená jídla')).toBeInTheDocument();
    expect(getAllByText('Brambory').length).toBeGreaterThan(0);
    expect(getAllByText('Mrkev').length).toBeGreaterThan(0);
  });

  it('toast after save links to /today', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();

    const toastLink = getByRole('link', { name: /přehled dne/i });
    expect(toastLink).toHaveAttribute('href', '/today');
  });
});
