import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import CategoryGrid from './CategoryGrid.svelte';

describe('CategoryGrid', () => {
  it('renders category buttons', () => {
    const { getByText } = render(CategoryGrid, { props: { selected: [] } });
    expect(getByText('Mléčné výrobky')).toBeInTheDocument();
    expect(getByText('Vejce')).toBeInTheDocument();
  });

  it('shows custom allergen input', () => {
    const { getByPlaceholderText } = render(CategoryGrid, { props: { selected: [] } });
    expect(getByPlaceholderText('Např. Cibule, Mrkev…')).toBeInTheDocument();
  });

  it('selecting a non-expandable category adds it to selected', async () => {
    let selected: string[] = [];
    const { getByText } = render(CategoryGrid, {
      props: { selected, expandable: false },
    });
    await fireEvent.click(getByText('Vejce'));
    await tick();
    // CategoryGrid uses $bindable — we verify the button reflects selection via class
    const btn = getByText('Vejce').closest('button');
    expect(btn?.className).toMatch(/bg-primary|bg-danger/);
  });

  it('marks disabled categories as non-interactive', () => {
    const { getByText } = render(CategoryGrid, {
      props: { selected: [], disabledSlugs: ['dairy'] },
    });
    const btn = getByText('Mléčné výrobky').closest('button');
    expect(btn).toBeDisabled();
  });

  it('shows "vaše alergie" label on disabled categories', () => {
    const { getByText } = render(CategoryGrid, {
      props: { selected: [], disabledSlugs: ['dairy'] },
    });
    expect(getByText('vaše alergie')).toBeInTheDocument();
  });

  it('applies danger variant styling when variant="danger"', async () => {
    let selected = ['eggs'];
    const { getByText } = render(CategoryGrid, {
      props: { selected, variant: 'danger' },
    });
    const btn = getByText('Vejce').closest('button');
    expect(btn?.className).toMatch(/bg-danger/);
  });

  it('adds a custom allergen on button click', async () => {
    const { getByPlaceholderText, getByText } = render(CategoryGrid, {
      props: { selected: [] },
    });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    await fireEvent.input(input, { target: { value: 'Paprika' } });
    await fireEvent.click(getByText('Přidat'));
    await tick();
    expect(getByText('Paprika')).toBeInTheDocument();
  });

  it('expandable mode opens sub-item panel on category click', async () => {
    const { getByText } = render(CategoryGrid, {
      props: { selected: [], expandable: true },
    });
    await fireEvent.click(getByText('Mléčné výrobky'));
    await tick();
    expect(getByText('Kravské mléko')).toBeInTheDocument();
  });
});
