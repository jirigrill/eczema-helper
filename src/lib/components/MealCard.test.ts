import { tick } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

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

  it('shows all four unlogged slots (not empty-state text) when meals array is empty', async () => {
    const { getByTestId, queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(getByTestId('meal-row-breakfast')).toBeInTheDocument();
    expect(getByTestId('meal-row-lunch')).toBeInTheDocument();
    expect(getByTestId('meal-row-snack')).toBeInTheDocument();
    expect(getByTestId('meal-row-dinner')).toBeInTheDocument();
    expect(queryByText('Zatím žádný záznam.')).not.toBeInTheDocument();
  });

  it('renders each meal item name', async () => {
    const meal = makeMeal({
      items: [
        { id: 'i1', name: 'Jogurt', foodId: 'jogurt', amount: 'portion' },
        { id: 'i2', name: 'Oves', foodId: 'oves', amount: 'spoon' },
      ],
    });
    const { getByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    expect(getByText(/Jogurt/)).toBeInTheDocument();
    expect(getByText(/Oves/)).toBeInTheDocument();
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
      '/meal?type=breakfast&date=2026-05-31&returnTo=/day/2026-05-31',
    );
  });

  it.each(['breakfast', 'lunch', 'snack', 'dinner'] as const)(
    'row for %s links to /meal with that exact type',
    async (mealType) => {
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
        `/meal?type=${mealType}&date=2026-05-31&returnTo=/day/2026-05-31`,
      );
    },
  );

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

  it('unlogged slot rows are anchor links (tappable to add meal)', async () => {
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(getByTestId('meal-row-breakfast').tagName).toBe('A');
    expect(getByTestId('meal-row-dinner').tagName).toBe('A');
  });

  it('does NOT render portion or preparation text on any logged row', async () => {
    const meal = makeMeal({
      items: [
        {
          id: 'i1',
          name: 'Jogurt',
          foodId: 'jogurt',
          amount: 'spoon',
          preparationMethod: 'boiled',
        },
      ],
    });
    const { queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    // No portion labels
    expect(queryByText(/Lžíce|Porce|Špetka|Čajová lžička/)).not.toBeInTheDocument();
    // No preparation labels
    expect(queryByText(/Vařené|Syrové|Pečené|Smažené/)).not.toBeInTheDocument();
    // No middle-dot separator (would only appear from portion/prep)
    expect(queryByText(/·/)).not.toBeInTheDocument();
  });

  it.each([
    ['breakfast', '🌅'],
    ['lunch', '☀️'],
    ['snack', '🍎'],
    ['dinner', '🌙'],
  ] as const)(
    'meal-type marker for %s renders an <svg> icon, not the legacy emoji',
    async (mealType, emoji) => {
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
    },
  );

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

  // ── New design: 4-slot layout ──────────────────────────────────────────────

  it('always renders all four meal-type slots in order regardless of logged meals', async () => {
    // Only breakfast logged — other 3 slots must still appear
    const meal = makeMeal({
      mealType: 'breakfast',
      items: [{ id: 'i1', name: 'Ovesná kaše', foodId: 'oves', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    expect(getByTestId('meal-row-breakfast')).toBeInTheDocument();
    expect(getByTestId('meal-row-lunch')).toBeInTheDocument();
    expect(getByTestId('meal-row-snack')).toBeInTheDocument();
    expect(getByTestId('meal-row-dinner')).toBeInTheDocument();
  });

  it('unlogged slot links to /meal with type, date, and returnTo', async () => {
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-06-15', meals: [], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId('meal-row-lunch');
    expect(row.tagName).toBe('A');
    expect(row.getAttribute('href')).toBe(
      '/meal?type=lunch&date=2026-06-15&returnTo=/day/2026-06-15',
    );
  });

  it('unlogged slot shows "+" and muted meal label', async () => {
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-06-15', meals: [], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId('meal-row-snack');
    expect(row.textContent).toMatch(/\+/);
    expect(row.textContent).toMatch(/Svačina/);
  });

  it('clean logged row: food names joined by " · " with no portion or prep text', async () => {
    const meal = makeMeal({
      mealType: 'breakfast',
      items: [
        { id: 'i1', name: 'Ovesná kaše', foodId: 'oves', amount: 'portion' },
        { id: 'i2', name: 'Banán', foodId: 'banan', amount: 'spoon' },
      ],
    });
    const { getByTestId, queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: [] },
    });
    await tick();
    const row = getByTestId('meal-row-breakfast');
    // Food names separated by ·
    expect(row.textContent).toMatch(/Ovesná kaše\s*·\s*Banán/);
    // No portion or prep strings
    expect(queryByText(/Porce|Lžíce|Špetka|Vařené|Syrové|Pečené|Smažené/)).not.toBeInTheDocument();
  });

  it('conflict logged row: shows allergen pill with Czech name', async () => {
    const meal = makeMeal({
      mealType: 'lunch',
      items: [{ id: 'i1', name: 'Máslo', foodId: 'kravske-mleko', amount: 'teaspoon' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: ['dairy'] },
    });
    await tick();
    const row = getByTestId('meal-row-lunch');
    // Allergen pill with Czech name from categoryStrings
    expect(row.textContent).toMatch(/⚠\s*Mléčné výrobky/);
  });

  it('conflict logged row: triggering food rendered with danger class', async () => {
    const meal = makeMeal({
      mealType: 'lunch',
      items: [{ id: 'i1', name: 'Máslo', foodId: 'kravske-mleko', amount: 'teaspoon' }],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: ['dairy'] },
    });
    await tick();
    const row = getByTestId('meal-row-lunch');
    // data-conflict="true" is on the food name span; it must also carry text-danger
    const conflictSpan = row.querySelector('[data-conflict="true"]');
    expect(conflictSpan).not.toBeNull();
    expect(conflictSpan?.className).toMatch(/text-danger/);
    expect(conflictSpan?.textContent).toMatch(/Máslo/);
  });

  it('multi-allergen conflict: one pill per distinct eliminated allergen, each triggering food in danger', async () => {
    const meal = makeMeal({
      mealType: 'dinner',
      items: [
        { id: 'i1', name: 'Jogurt', foodId: 'kravske-mleko', amount: 'portion' },
        { id: 'i2', name: 'Sójové mléko', foodId: 'sojove-mleko', amount: 'portion' },
        { id: 'i3', name: 'Rýže', foodId: 'ryze', amount: 'portion' },
      ],
    });
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-05-31', meals: [meal], eliminatedToday: ['dairy', 'soy'] },
    });
    await tick();
    const row = getByTestId('meal-row-dinner');
    // Two allergen pills
    expect(row.textContent).toMatch(/⚠\s*Mléčné výrobky/);
    expect(row.textContent).toMatch(/⚠\s*Sója/);
    // Two red foods, one clean food
    const conflictSpans = row.querySelectorAll('[data-conflict="true"]');
    const conflictTexts = Array.from(conflictSpans).map((s) => s.textContent ?? '');
    expect(conflictTexts.some((t) => t.includes('Jogurt'))).toBe(true);
    expect(conflictTexts.some((t) => t.includes('Sójové mléko'))).toBe(true);
    expect(conflictTexts.some((t) => t.includes('Rýže'))).toBe(false);
  });
});
