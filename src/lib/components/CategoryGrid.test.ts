import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import CategoryGrid from './CategoryGrid.svelte';

describe('CategoryGrid', () => {
  it('renders category buttons', () => {
    const { getByRole } = render(CategoryGrid, { props: { selected: [] } });
    // Tile labels also appear as family section headers, so scope to the button role.
    expect(getByRole('button', { name: /Mléčné výrobky/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Vejce/ })).toBeInTheDocument();
  });

  it('shows custom allergen input', () => {
    const { getByPlaceholderText } = render(CategoryGrid, { props: { selected: [] } });
    expect(getByPlaceholderText('Např. Cibule, Mrkev…')).toBeInTheDocument();
  });

  it('selecting a non-expandable category adds it to selected', async () => {
    let selected: string[] = [];
    const { getByRole } = render(CategoryGrid, {
      props: { selected, expandable: false },
    });
    const btn = getByRole('button', { name: /Vejce/ });
    await fireEvent.click(btn);
    await tick();
    // CategoryGrid uses $bindable — we verify the button reflects selection via class
    expect(btn.className).toMatch(/bg-primary|bg-danger/);
  });

  it('marks disabled categories as non-interactive', () => {
    const { getByRole } = render(CategoryGrid, {
      props: { selected: [], disabledSlugs: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Mléčné výrobky/ });
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
    const { getByRole } = render(CategoryGrid, {
      props: { selected, variant: 'danger' },
    });
    const btn = getByRole('button', { name: /Vejce/ });
    expect(btn.className).toMatch(/bg-danger/);
  });

  it('adds a custom allergen on button click', async () => {
    const { getByPlaceholderText, getByText } = render(CategoryGrid, {
      props: { selected: [] },
    });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    // 'Kokos' is not in the catalog → stays a custom other: chip
    await fireEvent.input(input, { target: { value: 'Kokos' } });
    await fireEvent.click(getByText('Přidat'));
    await tick();
    expect(getByText('Kokos')).toBeInTheDocument();
  });

  it('custom allergen input uses input-base atom', () => {
    const { getByPlaceholderText } = render(CategoryGrid, { props: { selected: [] } });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    expect(input.className).toMatch(/\binput-base\b/);
  });

  it('expandable mode opens sub-item panel on category click', async () => {
    const { getByText, getByRole } = render(CategoryGrid, {
      props: { selected: [], expandable: true },
    });
    await fireEvent.click(getByRole('button', { name: /Mléčné výrobky/ }));
    await tick();
    expect(getByText('Kravské mléko')).toBeInTheDocument();
  });

  it('typing a known Czech alias resolves to canonical allergen id, not other:', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(CategoryGrid, {
      props: { selected: [] },
    });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    // 'pšenice' is an alias for 'wheat'
    await fireEvent.input(input, { target: { value: 'pšenice' } });
    await fireEvent.click(getByText('Přidat'));
    await tick();
    // The wheat category button should now appear selected
    const btn = getByText('Pšenice / lepek').closest('button');
    expect(btn?.className).toMatch(/bg-primary|bg-danger/);
    // No custom chip labelled 'pšenice' should appear
    expect(queryByText('pšenice')).toBeNull();
  });

  it('typing an unknown food still creates an other: custom chip', async () => {
    const { getByPlaceholderText, getByText } = render(CategoryGrid, {
      props: { selected: [] },
    });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    await fireEvent.input(input, { target: { value: 'Datle' } });
    await fireEvent.click(getByText('Přidat'));
    await tick();
    expect(getByText('Datle')).toBeInTheDocument();
  });

  it('comma-separated input resolves known alias and creates other: for unknown', async () => {
    const { getByPlaceholderText, getByText, getByRole, queryByText } = render(CategoryGrid, {
      props: { selected: [] },
    });
    const input = getByPlaceholderText('Např. Cibule, Mrkev…');
    await fireEvent.input(input, { target: { value: 'ořechy, kokos' } });
    await fireEvent.click(getByText('Přidat'));
    await tick();
    // 'ořechy' is an alias for nuts — nuts category button selected
    const nutsBtn = getByRole('button', { name: /Ořechy/ });
    expect(nutsBtn.className).toMatch(/bg-primary|bg-danger/);
    // 'kokos' is unknown — custom chip appears
    expect(getByText('kokos')).toBeInTheDocument();
    // No custom chip for the canonical one
    expect(queryByText('ořechy')).toBeNull();
  });
});
