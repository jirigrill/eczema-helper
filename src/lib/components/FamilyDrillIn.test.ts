import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FamilyDrillIn from './FamilyDrillIn.svelte';

// The fruit family is the canonical example from the issue:
// allergen-grouped: citrus → pomeranč
// loose (allergenIds: []): jablko, hruška, …

describe('FamilyDrillIn — fruit family', () => {
  const baseProps = {
    familyId: 'fruit' as const,
    inMealFoodIds: [] as string[],
    eliminatedAllergenIds: [] as string[],
    onAddFood: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders allergen group header for citrus within fruit family', () => {
    const { getByText } = render(FamilyDrillIn, { props: baseProps });
    // citrus allergen should appear as a section header
    expect(getByText(/citrus/i)).toBeInTheDocument();
  });

  it('renders pomeranč (allergen-grouped food) under citrus', () => {
    const { getByRole } = render(FamilyDrillIn, { props: baseProps });
    expect(getByRole('button', { name: /Pomeranč/ })).toBeInTheDocument();
  });

  it('renders loose foods (jablko, hruška) without allergen header', () => {
    const { getByRole } = render(FamilyDrillIn, { props: baseProps });
    expect(getByRole('button', { name: /Jablko/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Hruška/ })).toBeInTheDocument();
  });

  it('calls onAddFood with foodId and Czech name when food tapped', async () => {
    const onAddFood = vi.fn();
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, onAddFood },
    });
    await fireEvent.click(getByRole('button', { name: /Jablko/ }));
    await tick();
    expect(onAddFood).toHaveBeenCalledWith('jablko', 'Jablko');
  });

  it('calls onBack when back button tapped', async () => {
    const onBack = vi.fn();
    const { getAllByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, onBack },
    });
    // Back button is the first button (header area)
    const backBtn = getAllByRole('button').find(b => b.textContent?.includes('←') || b.getAttribute('aria-label') === 'Zpět');
    expect(backBtn).toBeTruthy();
    await fireEvent.click(backBtn!);
    await tick();
    expect(onBack).toHaveBeenCalled();
  });

  it('marks in-meal foods with data-state="success"', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, inMealFoodIds: ['jablko'] },
    });
    const btn = getByRole('button', { name: /Jablko/ });
    expect(btn.dataset.state).toBe('success');
  });

  it('marks eliminated allergen food with data-state="danger"', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, eliminatedAllergenIds: ['citrus'] },
    });
    const btn = getByRole('button', { name: /Pomeranč/ });
    expect(btn.dataset.state).toBe('danger');
  });

  it('in-meal takes precedence over eliminated for state', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, inMealFoodIds: ['pomeranc'], eliminatedAllergenIds: ['citrus'] },
    });
    const btn = getByRole('button', { name: /Pomeranč/ });
    expect(btn.dataset.state).toBe('success');
  });
});
