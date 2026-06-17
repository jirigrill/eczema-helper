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

  it('every tile is a plain white, tappable tile — no active dot, no eliminated badge, no danger tint', () => {
    // Per the C.3 follow-up: active/eliminated state is shown only on the
    // foods inside a family (the drill-in), never on the family grid itself.
    const { getAllByRole } = render(FamilyGrid, {
      props: { onSelect: vi.fn() },
    });
    for (const btn of getAllByRole('button') as HTMLButtonElement[]) {
      expect(btn.disabled).toBe(false);
      expect(btn.className).toContain('bg-white');
      expect(btn.className).not.toContain('bg-danger');
      expect(btn.querySelector('[data-testid="active-dot"]')).toBeNull();
      expect(btn.querySelector('[data-testid="eliminated-badge"]')).toBeNull();
      expect(btn.dataset.state).toBeUndefined();
    }
  });
});
