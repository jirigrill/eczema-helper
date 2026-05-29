import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers, MealItem } from '$lib/domain/models';

const mockScheduleContext = writable<ScheduleContext>({ status: 'loading' });

vi.mock('$lib/stores/schedule-context', () => ({
  scheduleContext: { subscribe: mockScheduleContext.subscribe },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// ── Repository mock ──────────────────────────────────────────
const mockSave = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockLoadBySlot = vi.fn().mockResolvedValue({ ok: true, data: null });
vi.mock('$lib/adapters/dexie-meal-repository', () => ({
  DexieMealRepository: vi.fn().mockImplementation(() => ({
    save: mockSave,
    loadBySlot: mockLoadBySlot,
    listByDate: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  })),
}));
// Prevent real IndexedDB from opening — the mock repo never calls db
vi.mock('$lib/db/atopic-db', () => ({ db: {} }));
// Mutable page mock — tests can change mockPage.url before render to control returnTo
const mockPage = { url: new URL('http://localhost/meal') };
vi.mock('$app/state', () => ({ page: mockPage }));

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
  mockSave.mockClear();
  mockLoadBySlot.mockClear();
  mockLoadBySlot.mockResolvedValue({ ok: true, data: null }); // default: no saved slot
  mockPage.url = new URL('http://localhost/meal'); // reset returnTo to default
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

    // Pills use the chip component (text-only pill shape)
    const snidaneBtn = getByRole('button', { name: 'Snídaně' });
    expect(snidaneBtn.className).toContain('chip');

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
    expect(obedBtn.className).toContain('chip--active');

    const snidaneBtn = getByRole('button', { name: 'Snídaně' });
    expect(snidaneBtn.className).toContain('chip--muted');
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
    await fireEvent.click(getByRole('button', { name: /Jogurt/ }));
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

  // ── Slice 2d: inline item editing ────────────────────────

  async function addCustomItem(
    getByPlaceholderText: (text: string) => HTMLElement,
    getByRole: (role: string, opts: { name: string | RegExp }) => HTMLElement,
    name: string
  ) {
    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: name } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();
  }

  it('tapping a basket item row expands it with Množství and Příprava chip rows', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, queryByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');

    // Chip rows not visible before tap
    expect(queryByText('Množství')).not.toBeInTheDocument();
    expect(queryByText('Příprava')).not.toBeInTheDocument();

    // Tap the item row
    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;
    await fireEvent.click(itemRow);
    await tick();

    // Chip section labels appear
    expect(getByText('Množství')).toBeInTheDocument();
    expect(getByText('Příprava')).toBeInTheDocument();

    // Hint text appears under item name
    expect(getByText('uprav množství a přípravu')).toBeInTheDocument();

    // All 5 Množství chips visible
    expect(getByRole('button', { name: 'Porce' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Špetka' })).toBeInTheDocument();

    // All 4 Příprava chips visible
    expect(getByRole('button', { name: 'Vařené' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Dušené' })).toBeInTheDocument();
  });

  it('tapping the expanded row header collapses it', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, queryByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');

    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;

    // Expand
    await fireEvent.click(itemRow);
    await tick();
    expect(getByText('Množství')).toBeInTheDocument();

    // Collapse by tapping again
    await fireEvent.click(itemRow);
    await tick();
    expect(queryByText('Množství')).not.toBeInTheDocument();
    expect(queryByText('uprav množství a přípravu')).not.toBeInTheDocument();
  });

  it('only one basket item is expanded at a time', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');
    await addCustomItem(getByPlaceholderText, getByRole, 'Mrkev');

    const bramboRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;
    const mrkevRow = getByText('Mrkev').closest('[data-testid="basket-item"]') as HTMLElement;

    // Expand first item
    await fireEvent.click(bramboRow);
    await tick();
    expect(getByText('uprav množství a přípravu')).toBeInTheDocument();

    // Expand second item — first must collapse
    await fireEvent.click(mrkevRow);
    await tick();

    // Hint text still present (now belongs to Mrkev)
    expect(getByText('uprav množství a přípravu')).toBeInTheDocument();
    // Brambory's row should not show the hint (collapsed)
    const bramboHint = getByText('Brambory').closest('[data-testid="basket-item"]')?.querySelector('[data-testid="edit-hint"]');
    expect(bramboHint).toBeNull();
  });

  it('tapping a Množství chip updates item amount; collapsed subtitle reflects new value', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');
    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;

    // Expand → tap 'Špetka' chip → collapse
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Špetka' }));
    await tick();
    await fireEvent.click(itemRow);
    await tick();

    // Subtitle now shows 'šp.' (short label for pinch)
    expect(getByText(/šp\./)).toBeInTheDocument();
  });

  it('tapping the active Množství chip is a no-op; subtitle stays unchanged', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');
    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;

    // Expand → tap already-active 'Porce' → collapse
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Porce' }));
    await tick();
    await fireEvent.click(itemRow);
    await tick();

    // Amount unchanged — subtitle still shows 'porce'
    expect(getByText(/porce/)).toBeInTheDocument();
  });

  it('tapping a Příprava chip sets preparationMethod; collapsed subtitle reflects it', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');
    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;

    // Verify initial subtitle has no prep label (expand → collapse to read it)
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(itemRow);
    await tick();
    expect(getByText(/porce/).textContent).not.toMatch(/vařen|dušen|pečen|smažen/i);

    // Expand → tap 'Vařené' → collapse
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Vařené' }));
    await tick();
    await fireEvent.click(itemRow);
    await tick();

    // Subtitle now contains prep label
    expect(getByText(/vařené/i)).toBeInTheDocument();
  });

  it('tapping the active Příprava chip toggles it off; collapsed subtitle loses prep label', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText, getByRole, getByPlaceholderText } = render(MealPage);
    await tick();

    await addCustomItem(getByPlaceholderText, getByRole, 'Brambory');
    const itemRow = getByText('Brambory').closest('[data-testid="basket-item"]') as HTMLElement;

    // Set Vařené, collapse, verify it appears
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Vařené' }));
    await tick();
    await fireEvent.click(itemRow);
    await tick();
    expect(getByText(/vařené/i)).toBeInTheDocument();

    // Expand → tap 'Vařené' again → toggle off → collapse
    await fireEvent.click(itemRow);
    await tick();
    await fireEvent.click(getByRole('button', { name: 'Vařené' }));
    await tick();
    await fireEvent.click(itemRow);
    await tick();

    // Subtitle no longer shows prep label
    expect(getByText(/porce/).textContent).not.toMatch(/vařen/i);
  });

  // ── Slice 2e: meal commit + returnTo navigation ───────────

  it('"Hotovo" with items calls MealRepository.save() with composite id', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const saved = mockSave.mock.calls[0][0];
    expect(saved.id).toBe(`${today}:lunch`); // default meal type is lunch
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].name).toBe('Brambory');
    expect(saved.date).toBe(today);
    expect(saved.actor).toBe('mother');
  });

  it('"Hotovo" with empty basket does not call MealRepository.save()', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    await fireEvent.click(getByRole('button', { name: 'Hotovo' }));
    await tick();

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('after save goto is called with /today when no returnTo param', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();

    expect(goto).toHaveBeenCalledWith('/today');
  });

  it('after save goto is called with custom returnTo when param is present', async () => {
    mockPage.url = new URL('http://localhost/meal?returnTo=/program');
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Hotovo/ }));
    await tick();

    expect(goto).toHaveBeenCalledWith('/program');
  });

  it('back chevron calls goto with returnTo (defaults to /today)', async () => {
    setReady();
    const { goto } = await import('$app/navigation');
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    // PageHeader renders the back chevron as a button with text "‹"
    await fireEvent.click(getByRole('button', { name: '‹' }));
    await tick();

    expect(goto).toHaveBeenCalledWith('/today');
  });

  it('adding an eliminated item shows conflict toast', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getByText } = render(MealPage);
    await tick();

    // Open category sheet, expand dairy, pick Jogurt
    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléčné/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Jogurt/ }));
    await tick();

    // Conflict toast should appear with the full allergen name from categoryConfig
    expect(getByText(/Mléčné výrobky vyřazeno — odchylka zaznamenána/)).toBeInTheDocument();
  });

  // ── Issue 136: allergen status on sub-item chips ──────────

  it('sub-item chips in an eliminated category have data-state="danger"', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    // Open category sheet, drill into Mléčné (dairy — eliminated)
    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléčné/ }));
    await tick();

    // Every sub-item chip must carry data-state="danger"
    const jogurtBtn = getByRole('button', { name: /Jogurt/ });
    expect(jogurtBtn).toHaveAttribute('data-state', 'danger');
  });

  it('sub-item chips in a non-eliminated category do NOT have data-state="danger"', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();

    // Open category sheet, drill into Jahody (strawberries — not eliminated)
    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Jahody/ }));
    await tick();

    const cerstvBtn = getByRole('button', { name: /Čerstvé jahody/ });
    expect(cerstvBtn).not.toHaveAttribute('data-state', 'danger');
  });

  it('sub-item chips in an eliminated category show Czech "Vyloučeno" label', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, getAllByText } = render(MealPage);
    await tick();

    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Mléčné/ }));
    await tick();

    // At least one "Vyloučeno" label must be visible inside the sub-item panel
    expect(getAllByText('Vyloučeno').length).toBeGreaterThan(0);
  });

  it('sub-item chips in a non-eliminated category do NOT show "Vyloučeno" label', async () => {
    setReady({ eliminatedToday: ['dairy'] });
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();

    await fireEvent.click(getByRole('button', { name: /Všechny kategorie/ }));
    await tick();
    await fireEvent.click(getByRole('button', { name: /Jahody/ }));
    await tick();

    expect(queryByText('Vyloučeno')).not.toBeInTheDocument();
  });

  // ── Slice 2f: pill-switch autosave + slot re-open ──────────

  it('on mount, loadBySlot is called for the default meal slot (lunch)', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    render(MealPage);
    await tick();
    await tick();

    expect(mockLoadBySlot).toHaveBeenCalledWith(today, 'lunch');
  });

  it('on mount with a saved slot, basket is pre-populated with its items', async () => {
    const savedItems: MealItem[] = [
      { id: 'item-1', name: 'Brambory', allergenId: null, subitemId: null, amount: 'portion' },
    ];
    mockLoadBySlot.mockResolvedValueOnce({
      ok: true,
      data: {
        id: `${today}:lunch`, date: today, mealType: 'lunch', actor: 'mother' as const,
        items: savedItems, createdAt: new Date().toISOString(),
      },
    });

    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    await tick();

    expect(getByText('Brambory')).toBeInTheDocument();
  });

  it('on mount with no saved slot, basket shows empty state', async () => {
    // mockLoadBySlot already returns { ok: true, data: null } by default
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByText } = render(MealPage);
    await tick();
    await tick();

    expect(getByText(/Zatím prázdné/)).toBeInTheDocument();
  });

  it('switching meal pill with non-empty basket calls save() for the previous slot', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole } = render(MealPage);
    await tick();
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    mockSave.mockClear();
    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const saved = mockSave.mock.calls[0][0];
    expect(saved.id).toBe(`${today}:lunch`); // saved the PREVIOUS slot
    expect(saved.items[0].name).toBe('Brambory');
  });

  it('switching meal pill with empty basket does NOT call save()', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await tick();

    mockSave.mockClear();
    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('after pill switch, loadBySlot is called for the new slot', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole } = render(MealPage);
    await tick();
    await tick(); // consume initial mount load

    mockLoadBySlot.mockClear();
    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    expect(mockLoadBySlot).toHaveBeenCalledWith(today, 'breakfast');
  });

  it('after pill switch, basket shows items from the new slot if it was previously saved', async () => {
    const snidaneItems: MealItem[] = [
      { id: 'item-2', name: 'Jogurt', allergenId: 'dairy', subitemId: 'dairy:yogurt', amount: 'portion' },
    ];
    mockLoadBySlot
      .mockResolvedValueOnce({ ok: true, data: null }) // initial mount: lunch empty
      .mockResolvedValueOnce({                         // after switch: snídaně has items
        ok: true,
        data: {
          id: `${today}:breakfast`, date: today, mealType: 'breakfast', actor: 'mother' as const,
          items: snidaneItems, createdAt: new Date().toISOString(),
        },
      });

    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await tick();

    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    expect(queryByText('Jogurt')).toBeInTheDocument();
  });

  it('switching pill with non-empty basket shows an autosave toast with the previous meal type label', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByPlaceholderText, getByRole, getByText } = render(MealPage);
    await tick();
    await tick();

    await fireEvent.input(getByPlaceholderText('Název potraviny…'), { target: { value: 'Brambory' } });
    await fireEvent.click(getByRole('button', { name: 'Přidat' }));
    await tick();

    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    // Toast references the label of the slot that was just saved ("Oběd")
    expect(getByText(/Oběd.*uložen/)).toBeInTheDocument();
  });

  it('switching pill with empty basket does NOT show an autosave toast', async () => {
    setReady();
    const { default: MealPage } = await import('./+page.svelte');
    const { getByRole, queryByText } = render(MealPage);
    await tick();
    await tick();

    await fireEvent.click(getByRole('button', { name: 'Snídaně' }));
    await tick();
    await tick();

    expect(queryByText(/uložen/)).not.toBeInTheDocument();
  });
});
