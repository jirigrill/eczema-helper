import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FamilyGrid from './FamilyGrid.svelte';

describe('FamilyGrid', () => {
  it('renders one tile per family', () => {
    const { getAllByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn() },
    });
    // 13 FAMILIES defined in the catalog
    const tiles = getAllByRole('button');
    expect(tiles.length).toBe(13);
  });

  it('shows Czech family name on each tile', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn() },
    });
    expect(getByRole('button', { name: /Mléko/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Obiloviny/ })).toBeInTheDocument();
  });

  it('calls onSelect with familyId when a tile is tapped', async () => {
    const onSelect = vi.fn();
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect },
    });
    await fireEvent.click(getByRole('button', { name: /Mléko/ }));
    await tick();
    expect(onSelect).toHaveBeenCalledWith('dairy');
  });

  it('marks active families with data-state="active"', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), activeFamilyIds: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Mléko/ });
    expect(btn.dataset.state).toBe('active');
  });

  it('marks eliminated families with data-state="danger"', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), eliminatedFamilyIds: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Mléko/ });
    expect(btn.dataset.state).toBe('danger');
  });

  it('active takes precedence over eliminated', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), activeFamilyIds: ['dairy'], eliminatedFamilyIds: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Mléko/ });
    expect(btn.dataset.state).toBe('active');
  });

  it('neutral families have no data-state', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn() },
    });
    const btn = getByRole('button', { name: /Vejce/ });
    expect(btn.dataset.state).toBeUndefined();
  });
});
