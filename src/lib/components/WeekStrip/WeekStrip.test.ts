import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import WeekStrip from './WeekStrip.svelte';
import type { WeekStripCell } from './week-strip';

function makeCells(selectedDate: string, count = 7): WeekStripCell[] {
  const cells: WeekStripCell[] = [];
  for (let i = -(count - 1); i <= 0; i++) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const date = d.toISOString().split('T')[0];
    cells.push({ date, isSelected: i === 0, isBeforeStart: false });
  }
  return cells;
}

describe('WeekStrip', () => {
  const today = '2025-06-10';

  it('renders 7 cell buttons', async () => {
    const { getAllByTestId } = render(WeekStrip, {
      props: { cells: makeCells(today), showDnesPill: false, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(getAllByTestId('week-strip-cell')).toHaveLength(7);
  });

  it('selected cell has aria-current=date', async () => {
    const { getAllByTestId } = render(WeekStrip, {
      props: { cells: makeCells(today), showDnesPill: false, today, onselectdate: vi.fn() },
    });
    await tick();
    const cells = getAllByTestId('week-strip-cell');
    const selected = cells.find((c) => c.getAttribute('aria-current') === 'date');
    expect(selected).toBeTruthy();
  });

  it('does not show Dnes pill when showDnesPill is false', async () => {
    const { queryByTestId } = render(WeekStrip, {
      props: { cells: makeCells(today), showDnesPill: false, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(queryByTestId('dnes-pill')).toBeNull();
  });

  it('shows Dnes pill when showDnesPill is true', async () => {
    const { getByTestId } = render(WeekStrip, {
      props: { cells: makeCells('2025-06-08'), showDnesPill: true, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(getByTestId('dnes-pill')).toBeInTheDocument();
  });

  it('calls onselectdate with cell date on cell click', async () => {
    const fn = vi.fn();
    const cells = makeCells(today);
    const { getAllByTestId } = render(WeekStrip, {
      props: { cells, showDnesPill: false, today, onselectdate: fn },
    });
    await tick();
    const cellButtons = getAllByTestId('week-strip-cell');
    cellButtons[0].click();
    expect(fn).toHaveBeenCalledWith(cells[0].date);
  });

  it('calls onselectdate with today on Dnes pill click', async () => {
    const fn = vi.fn();
    const { getByTestId } = render(WeekStrip, {
      props: { cells: makeCells('2025-06-08'), showDnesPill: true, today, onselectdate: fn },
    });
    await tick();
    getByTestId('dnes-pill').click();
    expect(fn).toHaveBeenCalledWith(today);
  });
});
