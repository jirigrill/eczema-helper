import { tick } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FoodEditor from './FoodEditor.svelte';

const baseProps = {
  amount: 'portion' as const,
  preparation: undefined,
  preparations: ['raw', 'boiled', 'baked', 'fried'] as const,
  onAmountChange: vi.fn(),
  onPreparationChange: vi.fn(),
};

describe('FoodEditor', () => {
  it('renders Množství section with all 5 portion chips', () => {
    const { getByText } = render(FoodEditor, { props: baseProps });
    expect(getByText('Množství')).toBeInTheDocument();
    expect(getByText('Porce')).toBeInTheDocument();
    expect(getByText('Špetka')).toBeInTheDocument();
    expect(getByText('Lžička')).toBeInTheDocument();
    expect(getByText('Lžíce')).toBeInTheDocument();
    expect(getByText('Balení')).toBeInTheDocument();
  });

  it('renders a chip for each preparation the food offers', () => {
    const { getByText } = render(FoodEditor, { props: baseProps });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(getByText('Vařené')).toBeInTheDocument();
    expect(getByText('Pečené')).toBeInTheDocument();
    expect(getByText('Smažené')).toBeInTheDocument();
  });

  it('renders the specialty chips (Sušené / Uzené / Naložené) when offered', () => {
    const { getByText } = render(FoodEditor, {
      props: { ...baseProps, preparations: ['raw', 'baked', 'dried', 'smoked', 'cured'] as const },
    });
    expect(getByText('Sušené')).toBeInTheDocument();
    expect(getByText('Uzené')).toBeInTheDocument();
    expect(getByText('Naložené')).toBeInTheDocument();
  });

  it('shows only the offered subset (liquid: Syrové, Vařené, Pečené)', () => {
    const { getByText, queryByText } = render(FoodEditor, {
      props: { ...baseProps, preparations: ['raw', 'boiled', 'baked'] as const },
    });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(getByText('Vařené')).toBeInTheDocument();
    expect(getByText('Pečené')).toBeInTheDocument();
    expect(queryByText('Smažené')).not.toBeInTheDocument();
  });

  it('shows only Syrové for a raw-only food', () => {
    const { getByText, queryByText } = render(FoodEditor, {
      props: { ...baseProps, preparations: ['raw'] as const },
    });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(queryByText('Vařené')).not.toBeInTheDocument();
    expect(queryByText('Pečené')).not.toBeInTheDocument();
    expect(queryByText('Smažené')).not.toBeInTheDocument();
  });

  it('shows no preparation row when the food offers none', () => {
    const { queryByText } = render(FoodEditor, {
      props: { ...baseProps, preparations: [] as const },
    });
    expect(queryByText('Příprava')).not.toBeInTheDocument();
    expect(queryByText('Syrové')).not.toBeInTheDocument();
    expect(queryByText('Vařené')).not.toBeInTheDocument();
  });

  it('active amount chip is marked active', () => {
    const { getByRole } = render(FoodEditor, { props: { ...baseProps, amount: 'spoon' as const } });
    const spoonChip = getByRole('button', { name: 'Lžíce' });
    expect(spoonChip.className).toContain('chip--active');
  });

  it('calls onAmountChange with new portion kind when chip tapped', async () => {
    const onAmountChange = vi.fn();
    const { getByRole } = render(FoodEditor, { props: { ...baseProps, onAmountChange } });
    await fireEvent.click(getByRole('button', { name: 'Špetka' }));
    await tick();
    expect(onAmountChange).toHaveBeenCalledWith('pinch');
  });

  it('calls onPreparationChange with method when a prep chip is tapped', async () => {
    const onPreparationChange = vi.fn();
    const { getByRole } = render(FoodEditor, { props: { ...baseProps, onPreparationChange } });
    await fireEvent.click(getByRole('button', { name: 'Vařené' }));
    await tick();
    expect(onPreparationChange).toHaveBeenCalledWith('boiled');
  });

  it('calls onPreparationChange with raw when Syrové chip is tapped', async () => {
    const onPreparationChange = vi.fn();
    const { getByRole } = render(FoodEditor, { props: { ...baseProps, onPreparationChange } });
    await fireEvent.click(getByRole('button', { name: 'Syrové' }));
    await tick();
    expect(onPreparationChange).toHaveBeenCalledWith('raw');
  });

  it('calls onPreparationChange with undefined when active prep chip is re-tapped (toggle off)', async () => {
    const onPreparationChange = vi.fn();
    const { getByRole } = render(FoodEditor, {
      props: { ...baseProps, preparation: 'boiled' as const, onPreparationChange },
    });
    await fireEvent.click(getByRole('button', { name: 'Vařené' }));
    await tick();
    expect(onPreparationChange).toHaveBeenCalledWith(undefined);
  });
});
