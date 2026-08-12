import { tick } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import type { Meal } from '$lib/domain/models';

import MealCard from './MealCard.svelte';

function makeMeal(overrides?: Partial<Meal>): Meal {
  return {
    id: '2026-05-31:breakfast:mother',
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
      props: { date: '2026-05-31', meals: [], eligibleActors: ['mother'] },
    });
    await tick();
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('shows all four unlogged slots (not empty-state text) when meals array is empty', async () => {
    const { getByTestId, queryByText } = render(MealCard, {
      props: { date: '2026-05-31', meals: [], eligibleActors: ['mother'] },
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
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
    });
    await tick();
    expect(getByText(/Jogurt/)).toBeInTheDocument();
    expect(getByText(/Oves/)).toBeInTheDocument();
  });

  it('renders meal type icon and label', async () => {
    const meal = makeMeal({ mealType: 'dinner' });
    const { getByText } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
    });
    await tick();
    // dinner label from mealConfig
    expect(getByText('Večeře')).toBeInTheDocument();
  });

  it('does NOT render a "+ Přidat" link — the Meal-Type FAB Submenu is the launcher now', async () => {
    const { queryByText, queryByTestId } = render(MealCard, {
      props: { date: '2026-06-13', meals: [], eligibleActors: ['mother'] },
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
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
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
        id: `2026-05-31:${mealType}:mother`,
        mealType,
        items: [{ id: 'i1', name: 'X', foodId: 'jogurt', amount: 'portion' }],
      });
      const { getByTestId } = render(MealCard, {
        props: {
          date: '2026-05-31',
          meals: [meal],
          eligibleActors: ['mother'],
        },
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
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
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
      props: { date: '2026-05-31', meals: [], eligibleActors: ['mother'] },
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
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
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
        id: `2026-05-31:${mealType}:mother`,
        mealType,
        items: [{ id: 'i1', name: 'X', foodId: 'jogurt', amount: 'portion' }],
      });
      const { getByTestId, queryByText } = render(MealCard, {
        props: {
          date: '2026-05-31',
          meals: [meal],
          eligibleActors: ['mother'],
        },
      });
      await tick();
      const row = getByTestId(`meal-row-${mealType}`);
      expect(row.querySelector('svg')).not.toBeNull();
      expect(queryByText(emoji)).not.toBeInTheDocument();
    },
  );

  // ── New design: 4-slot layout ──────────────────────────────────────────────

  it('always renders all four meal-type slots in order regardless of logged meals', async () => {
    // Only breakfast logged — other 3 slots must still appear
    const meal = makeMeal({
      mealType: 'breakfast',
      items: [{ id: 'i1', name: 'Ovesná kaše', foodId: 'oves', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
    });
    await tick();
    expect(getByTestId('meal-row-breakfast')).toBeInTheDocument();
    expect(getByTestId('meal-row-lunch')).toBeInTheDocument();
    expect(getByTestId('meal-row-snack')).toBeInTheDocument();
    expect(getByTestId('meal-row-dinner')).toBeInTheDocument();
  });

  it('unlogged slot links to /meal with type, date, and returnTo', async () => {
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-06-15', meals: [], eligibleActors: ['mother'] },
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
      props: { date: '2026-06-15', meals: [], eligibleActors: ['mother'] },
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
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
    });
    await tick();
    const row = getByTestId('meal-row-breakfast');
    // Food names separated by ·
    expect(row.textContent).toMatch(/Ovesná kaše\s*·\s*Banán/);
    // No portion or prep strings
    expect(queryByText(/Porce|Lžíce|Špetka|Vařené|Syrové|Pečené|Smažené/)).not.toBeInTheDocument();
  });

  // ── #570: single-actor collapse ────────────────────────────────────────────

  it('single eligible actor: logged slot collapses to one row with no actor marker', async () => {
    const meal = makeMeal({
      mealType: 'breakfast',
      actor: 'mother',
      items: [{ id: 'i1', name: 'Ovesná kaše', foodId: 'oves', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [meal],
        eligibleActors: ['mother'],
      },
    });
    await tick();
    const row = getByTestId('meal-row-breakfast');
    expect(row.textContent).toMatch(/Ovesná kaše/);
    // No stacked per-actor sub-rows in the single-actor collapse.
    expect(row.querySelector('[data-testid="meal-actor-row-mother"]')).toBeNull();
    expect(row.querySelector('[data-testid="meal-actor-row-baby"]')).toBeNull();
  });

  // ── #570: mixed-stage dual-actor stacked rows ───────────────────────────────

  it('mixed stage: a slot with both actors logged shows two actor-marked rows under a shared header', async () => {
    const mother = makeMeal({
      id: '2026-05-31:lunch:mother',
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
    });
    const baby = makeMeal({
      id: '2026-05-31:lunch:baby',
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [mother, baby],
        eligibleActors: ['mother', 'baby'],
      },
    });
    await tick();
    const slot = getByTestId('meal-row-lunch');
    // Shared header label appears once.
    expect(slot.textContent).toMatch(/Oběd/);
    // Two per-actor rows, each with the other actor's foods.
    const motherRow = getByTestId('meal-actor-row-mother');
    const babyRow = getByTestId('meal-actor-row-baby');
    expect(motherRow.textContent).toMatch(/Rýže/);
    expect(babyRow.textContent).toMatch(/Brambory/);
    // Each row carries its actor marker svg.
    expect(motherRow.querySelector('svg')).not.toBeNull();
    expect(babyRow.querySelector('svg')).not.toBeNull();
  });

  it('mixed stage: both actors filled shows a single chevron for the whole slot, not one per row', async () => {
    const mother = makeMeal({
      id: '2026-05-31:lunch:mother',
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
    });
    const baby = makeMeal({
      id: '2026-05-31:lunch:baby',
      mealType: 'lunch',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [mother, baby],
        eligibleActors: ['mother', 'baby'],
      },
    });
    await tick();
    const slot = getByTestId('meal-row-lunch');
    const chevrons = Array.from(slot.querySelectorAll('span')).filter(
      (el) => el.textContent === '›',
    );
    expect(chevrons).toHaveLength(1);
  });

  it('mixed stage: one actor empty shows that row a "+", the logged row a "›"', async () => {
    const mother = makeMeal({
      id: '2026-05-31:lunch:mother',
      mealType: 'lunch',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [mother],
        eligibleActors: ['mother', 'baby'],
      },
    });
    await tick();
    const motherRow = getByTestId('meal-actor-row-mother');
    const babyRow = getByTestId('meal-actor-row-baby');
    expect(motherRow.textContent).toMatch(/›/);
    expect(motherRow.textContent).not.toMatch(/\+/);
    expect(babyRow.textContent).toMatch(/\+/);
    expect(babyRow.textContent).not.toMatch(/›/);
  });

  it('mixed stage: both actors empty collapses the section to a single "+", no per-actor rows', async () => {
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [],
        eligibleActors: ['mother', 'baby'],
      },
    });
    await tick();
    const slot = getByTestId('meal-row-snack');
    expect(slot.textContent).toMatch(/\+/);
    expect(slot.querySelector('[data-testid="meal-actor-row-mother"]')).toBeNull();
    expect(slot.querySelector('[data-testid="meal-actor-row-baby"]')).toBeNull();
  });

  it('mixed stage: each actor sees only its own meal, not the other actor’s (per-actor row selection)', async () => {
    // Both actors log breakfast; the baby row must not show the mother's food.
    const mother = makeMeal({
      id: '2026-05-31:breakfast:mother',
      mealType: 'breakfast',
      actor: 'mother',
      items: [{ id: 'm1', name: 'Káva', foodId: 'kava', amount: 'portion' }],
    });
    const baby = makeMeal({
      id: '2026-05-31:breakfast:baby',
      mealType: 'breakfast',
      actor: 'baby',
      items: [{ id: 'b1', name: 'Kaše', foodId: 'oves', amount: 'portion' }],
    });
    const { getByTestId } = render(MealCard, {
      props: {
        date: '2026-05-31',
        meals: [mother, baby],
        eligibleActors: ['mother', 'baby'],
      },
    });
    await tick();
    const motherRow = getByTestId('meal-actor-row-mother');
    const babyRow = getByTestId('meal-actor-row-baby');
    expect(motherRow.textContent).toMatch(/Káva/);
    expect(motherRow.textContent).not.toMatch(/Kaše/);
    expect(babyRow.textContent).toMatch(/Kaše/);
    expect(babyRow.textContent).not.toMatch(/Káva/);
  });
});
