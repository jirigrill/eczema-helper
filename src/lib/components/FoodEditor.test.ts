import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FoodEditor from './FoodEditor.svelte';

const baseProps = {
  amount: 'portion' as const,
  preparation: undefined,
  form: 'cookable' as const,
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

  it('cookable food shows all four preparation chips including Syrové', () => {
    const { getByText } = render(FoodEditor, { props: baseProps });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(getByText('Vařené')).toBeInTheDocument();
    expect(getByText('Pečené')).toBeInTheDocument();
    expect(getByText('Smažené')).toBeInTheDocument();
  });

  it('liquid food shows only Syrové, Vařené, Pečené', () => {
    const { getByText, queryByText } = render(FoodEditor, {
      props: { ...baseProps, form: 'liquid' as const },
    });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(getByText('Vařené')).toBeInTheDocument();
    expect(getByText('Pečené')).toBeInTheDocument();
    expect(queryByText('Smažené')).not.toBeInTheDocument();
  });

  it('raw-only food shows only Syrové', () => {
    const { getByText, queryByText } = render(FoodEditor, {
      props: { ...baseProps, form: 'raw-only' as const },
    });
    expect(getByText('Příprava')).toBeInTheDocument();
    expect(getByText('Syrové')).toBeInTheDocument();
    expect(queryByText('Vařené')).not.toBeInTheDocument();
    expect(queryByText('Pečené')).not.toBeInTheDocument();
    expect(queryByText('Smažené')).not.toBeInTheDocument();
  });

  it('none food shows no preparation row at all', () => {
    const { queryByText } = render(FoodEditor, {
      props: { ...baseProps, form: 'none' as const },
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
