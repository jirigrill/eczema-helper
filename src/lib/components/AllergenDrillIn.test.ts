import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import AllergenDrillIn from './AllergenDrillIn.svelte';

// legumes family has 2 allergens: soy + legumes — good for toggle testing
// eggs family has 1 allergen: eggs — used for single-item render test

describe('AllergenDrillIn — legumes family', () => {
  const baseProps = {
    familyId: 'legumes' as const,
    selected: [] as string[],
    variant: 'primary' as const,
    onBack: vi.fn(),
  };

  it('renders allergen chips for soy and legumes', () => {
    const { getByRole } = render(AllergenDrillIn, { props: baseProps });
    expect(getByRole('button', { name: /Sója/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Luštěniny/ })).toBeInTheDocument();
  });

  it('back button calls onBack', async () => {
    const onBack = vi.fn();
    const { getByRole } = render(AllergenDrillIn, { props: { ...baseProps, onBack } });
    await fireEvent.click(getByRole('button', { name: /Zpět/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('clicking an allergen chip sets data-selected=true', async () => {
    const { getByRole } = render(AllergenDrillIn, { props: { ...baseProps, selected: [] } });
    const chip = getByRole('button', { name: /Sója/ });
    expect(chip).toHaveAttribute('data-selected', 'false');
    await fireEvent.click(chip);
    await tick();
    expect(chip).toHaveAttribute('data-selected', 'true');
  });

  it('clicking a selected allergen deselects it', async () => {
    const { getByRole } = render(AllergenDrillIn, {
      props: { ...baseProps, selected: ['soy'] },
    });
    const chip = getByRole('button', { name: /Sója/ });
    expect(chip).toHaveAttribute('data-selected', 'true');
    await fireEvent.click(chip);
    await tick();
    expect(chip).toHaveAttribute('data-selected', 'false');
  });
});

describe('AllergenDrillIn — eggs family (single allergen)', () => {
  it('renders the eggs allergen chip', () => {
    const { getByRole } = render(AllergenDrillIn, {
      props: {
        familyId: 'eggs' as const,
        selected: [],
        variant: 'primary' as const,
        onBack: vi.fn(),
      },
    });
    expect(getByRole('button', { name: /Vejce/ })).toBeInTheDocument();
  });
});

describe('AllergenDrillIn — variant styling', () => {
  it('selected chip has danger styling when variant=danger', async () => {
    const { getByRole } = render(AllergenDrillIn, {
      props: {
        familyId: 'legumes' as const,
        selected: ['soy'],
        variant: 'danger' as const,
        onBack: vi.fn(),
      },
    });
    const chip = getByRole('button', { name: /Sója/ });
    expect(chip.className).toContain('border-danger');
  });
});
