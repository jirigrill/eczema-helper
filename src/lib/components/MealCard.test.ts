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

  it('"+ Přidat" link points at the card\'s date', async () => {
    const { getByTestId } = render(MealCard, {
      props: { date: '2026-06-13', meals: [], eliminatedToday: [] },
    });
    await tick();
    const link = getByTestId('day-card-right').querySelector('a');
    expect(link?.getAttribute('href')).toBe(
      '/meal?date=2026-06-13&returnTo=/day/2026-06-13',
    );
  });

  it('"+ Přidat" link href updates when the date prop changes', async () => {
    const { getByTestId, rerender } = render(MealCard, {
      props: { date: '2026-06-14', meals: [], eliminatedToday: [] },
    });
    await tick();
    expect(getByTestId('day-card-right').querySelector('a')?.getAttribute('href')).toBe(
      '/meal?date=2026-06-14&returnTo=/day/2026-06-14',
    );

    await rerender({ date: '2026-06-13', meals: [], eliminatedToday: [] });
    await tick();
    expect(getByTestId('day-card-right').querySelector('a')?.getAttribute('href')).toBe(
      '/meal?date=2026-06-13&returnTo=/day/2026-06-13',
    );
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
