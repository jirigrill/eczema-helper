import { tick } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FamilyGrid from './FamilyGrid.svelte';

describe('FamilyGrid', () => {
  it('renders one tile per family', () => {
    const { getAllByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn() },
    });
    // 14 FAMILIES defined in the catalog (13 clinical + custom)
    const tiles = getAllByRole('button');
    expect(tiles.length).toBe(14);
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

  it('marks active families with a primary dot and data-state="active"', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), activeFamilyIds: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Mléko/ });
    expect(btn.dataset.state).toBe('active');
    expect(btn.querySelector('[data-testid="active-dot"]')).not.toBeNull();
  });

  it('a non-active tile is a plain white tile — no dot, no data-state', () => {
    const { getByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), activeFamilyIds: ['dairy'] },
    });
    const btn = getByRole('button', { name: /Vejce/ });
    expect(btn.className).toContain('bg-white');
    expect(btn.querySelector('[data-testid="active-dot"]')).toBeNull();
    expect(btn.dataset.state).toBeUndefined();
  });

  it('never renders an eliminated badge or danger tint — elimination shows on the food inside the family, not the grid', () => {
    const { getAllByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn(), activeFamilyIds: ['dairy'] },
    });
    for (const btn of getAllByRole('button') as HTMLButtonElement[]) {
      expect(btn.disabled).toBe(false);
      expect(btn.className).not.toContain('bg-danger');
      expect(btn.querySelector('[data-testid="eliminated-badge"]')).toBeNull();
    }
  });
});
