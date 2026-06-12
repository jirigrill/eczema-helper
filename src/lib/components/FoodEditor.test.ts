import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FoodEditor from './FoodEditor.svelte';

const baseProps = {
  amount: 'portion' as const,
  preparation: undefined,
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

  it('renders Příprava section with all 4 method chips', () => {
    const { getByText } = render(FoodEditor, { props: baseProps });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Vařené')).toBeInTheDocument();
    expect(getByText('Dušené')).toBeInTheDocument();
    expect(getByText('Pečené')).toBeInTheDocument();
    expect(getByText('Smažené')).toBeInTheDocument();
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
