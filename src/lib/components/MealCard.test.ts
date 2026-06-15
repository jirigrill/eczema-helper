import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Meal } from '$lib/domain/models';
import MealCard from './MealCard.svelte';

function makeMeal(overrides?: Partial<Meal>): Meal {
  return {
    id: '2026-05-31:breakfast',
    date: '2026-05-31',
    mealType: 'breakfast',
    actor: 'mother',
    items: [],
    createdAt: '2026-05-31T08:00:00.000Z',
    ...overrides,
  };
}

describe('MealCard', () => {
  it('shows the section label "Dnešní jídla"', async () => {
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('shows empty-state text when meals array is empty', async () => {
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(getByText('Zatím žádný záznam.')).toBeInTheDocument();
  });

  it('renders each meal item name', async () => {
    const meal = makeMeal({
      items: [
        { id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'portion' },
        { id: 'i2', name: 'Ovesné vločky', foodId: 'ovesne-vlocky', amount: 'spoon' },
      ],
    });
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    expect(getByText(/Jogurt/)).toBeInTheDocument();
    expect(getByText(/Ovesné vločky/)).toBeInTheDocument();
  });

  it('renders meal type icon and label', async () => {
    const meal = makeMeal({ mealType: 'dinner' });
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    // dinner label from mealConfig
    expect(getByText('Večeře')).toBeInTheDocument();
  });

  it('does NOT render a "+ Přidat" link — the Meal-Type FAB Submenu is the launcher now', async () => {
    const { queryByText, queryByTestId } = render(MealCard, {
      props: { date: '2026-06-13', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(queryByText(/\+ Přidat/)).not.toBeInTheDocument();
    // The DayCard right-snippet is no longer used — no testid emitted.
    expect(queryByTestId('day-card-right')).not.toBeInTheDocument();
  });

  it('renders each finalized meal row as a tap-to-edit link to /meal?type=…&date=…&returnTo=…', async () => {
    const meal = makeMeal({
      mealType: 'breakfast',
      date: '2026-05-31',
      items: [{ id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId('meal-row-breakfast');
    expect(row.tagName).toBe('A');
    expect(row.getAttribute('href')).toBe(
      '/meal?type=breakfast&date=2026-05-31&returnTo=/day/2026-05-31'
    );
  });

  it.each([
    'breakfast',
    'lunch',
    'snack',
    'dinner',
  ] as const)('row for %s links to /meal with that exact type', async (mealType) => {
    const meal = makeMeal({
      id: `2026-05-31:${mealType}`,
      mealType,
      items: [{ id: 'i1', name: 'X', foodId: 'jogurt', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId(`meal-row-${mealType}`);
    expect(row.getAttribute('href')).toBe(
      `/meal?type=${mealType}&date=2026-05-31&returnTo=/day/2026-05-31`
    );
  });

  it('row has a single tap gesture — no swipe/long-press handlers attached', async () => {
    const meal = makeMeal({
      mealType: 'breakfast',
      items: [{ id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId('meal-row-breakfast');
    // No long-press / right-click menu handler.
    expect(row.getAttribute('oncontextmenu')).toBeNull();
    // No swipe gesture wiring.
    expect(row.getAttribute('onpointerdown')).toBeNull();
    expect(row.getAttribute('ontouchstart')).toBeNull();
    // No swipe-related data attribute.
    const attrs = row.getAttributeNames();
    expect(attrs.find((a) => a.startsWith('data-swipe'))).toBeUndefined();
  });

  it('the empty-state label is non-interactive (not a link or button)', async () => {
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eliminatedToday: [] },
    });
    await tick();
    const label = getByText('Zatím žádný záznam.');
    // The label itself is a plain element.
    expect(['A', 'BUTTON']).not.toContain(label.tagName);
    // No interactive ARIA role anywhere up the chain (would announce as button/link to screen readers).
    let node: HTMLElement | null = label;
    while (node) {
      const role = node.getAttribute('role');
      expect(role === 'button' || role === 'link').toBe(false);
      // Stop once we've climbed past the card boundary.
      if (node.tagName === 'BODY') break;
      node = node.parentElement;
    }
  });

  it('renders portion as full Czech label (e.g. "Lžíce"), not the raw key or short form', async () => {
    const meal = makeMeal({
      items: [{ id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'spoon' }],
    });
    const { getByText, queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    expect(getByText(/Lžíce/)).toBeInTheDocument();
    // Must not show the raw key or the short form.
    expect(queryByText(/\bspoon\b/)).not.toBeInTheDocument();
    expect(queryByText(/\blžíce\b/)).not.toBeInTheDocument(); // .short is lowercase 'lžíce'
  });

  it('appends "· {preparation label}" suffix only when preparationMethod is set', async () => {
    const mealWithPrep = makeMeal({
      items: [{ id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'spoon', preparationMethod: 'boiled' }],
    });
    const { getByText, unmount } = render(MealCard, {
      props: { date: '2026-05-31', meals: [mealWithPrep], eliminatedToday: [] },
    });
    await tick();
    // The full chip text reads "Jogurt Lžíce · Vařené" (whitespace-tolerant).
    expect(getByText(/Lžíce\s*·\s*Vařené/)).toBeInTheDocument();
    unmount();

    const mealNoPrep = makeMeal({
      items: [{ id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'spoon' }],
    });
    const { queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [mealNoPrep], eliminatedToday: [] },
    });
    await tick();
    // No middle-dot when preparation is unset.
    expect(queryByText(/·/)).not.toBeInTheDocument();
  });

  it.each([
    ['breakfast', '🌅'],
    ['lunch',     '☀️'],
    ['snack',     '🍎'],
    ['dinner',    '🌙'],
  ] as const)('meal-type marker for %s renders an <svg> icon, not the legacy emoji', async (mealType, emoji) => {
    const meal = makeMeal({
      id: `2026-05-31:${mealType}`,
      mealType,
      items: [{ id: 'i1', name: 'X', foodId: 'jogurt', amount: 'portion' }],
    });
    const { getByTestId, queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId(`meal-row-${mealType}`);
    expect(row.querySelector('svg')).not.toBeNull();
    expect(queryByText(emoji)).not.toBeInTheDocument();
  });

  it('applies warning styling to items whose food triggers are in eliminatedToday', async () => {
    const meal = makeMeal({
      items: [{ id: 'i1', name: 'Máslo', foodId: 'kravske-mleko', amount: 'teaspoon' }],
    });
    const { container } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: ['dairy'] },
    });
    await tick();
    // The chip for a conflicting item carries a data-conflict attribute
    const chip = container.querySelector('[data-conflict="true"]');
    expect(chip).toBeInTheDocument();
  });
});
