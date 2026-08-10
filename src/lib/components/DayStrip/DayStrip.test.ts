import { tick } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import DayStrip from './DayStrip.svelte';
import type { DayStripCell } from './day-strip';

function cell(date: string, partial: Partial<DayStripCell> = {}): DayStripCell {
  return {
    date,
    isSelected: false,
    isToday: false,
    ...partial,
  };
}

describe('DayStrip', () => {
  const today = '2026-06-10';

  it('renders one button per cell with the day-strip-cell testid', async () => {
    const cells: DayStripCell[] = [
      cell('2026-06-08'),
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(getAllByTestId('day-strip-cell')).toHaveLength(3);
  });

  it('the selected cell carries aria-current=date', async () => {
    const cells: DayStripCell[] = [cell('2026-06-08'), cell('2026-06-09', { isSelected: true })];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    const current = buttons.find((b) => b.getAttribute('aria-current') === 'date');
    expect(current).toBeTruthy();
    expect(current?.getAttribute('data-date')).toBe('2026-06-09');
  });

  it('does NOT render a Dnes pill', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { queryByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(queryByTestId('dnes-pill')).toBeNull();
  });

  it('today cell renders a permanent ring marker', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { getByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    const todayCell = getByTestId('day-strip-cell');
    expect(todayCell.querySelector('[data-testid="day-strip-today-ring"]')).toBeTruthy();
  });

  it('the ring marker carries no record state — it only marks today', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { getByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    const ring = getByTestId('day-strip-today-ring');
    expect(ring.getAttribute('data-recorded')).toBeNull();
    expect(ring.className).toContain('bg-transparent');
  });

  it('today renders no separate ring when it is also the selected cell', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: true })];
    const { queryByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    // The primary-filled selection already marks the cell.
    expect(queryByTestId('day-strip-today-ring')).toBeNull();
  });

  it("clicking any cell calls onselectdate with that cell's date", async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell('2026-05-25'),
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: fn },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    buttons[0]!.click();
    expect(fn).toHaveBeenCalledWith('2026-05-25');
  });

  it('renders future cells passed to it (the strip only receives more cells, #654)', async () => {
    const cells: DayStripCell[] = [
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
      cell('2026-06-11'),
      cell('2026-06-17'), // today + 7d
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: vi.fn() },
    });
    await tick();
    const dates = getAllByTestId('day-strip-cell').map((b) => b.getAttribute('data-date'));
    expect(dates).toContain('2026-06-11');
    expect(dates).toContain('2026-06-17');
  });

  it('a future cell is selectable and reports its own date on click (US-10)', async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell(today, { isToday: true, isSelected: true }),
      cell('2026-06-15'),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: fn },
    });
    await tick();
    getAllByTestId('day-strip-cell')[1]!.click();
    expect(fn).toHaveBeenCalledWith('2026-06-15');
  });

  it('clicking a past cell does not jump to today (no jump-to-today behavior)', async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell('2026-05-25'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, onselectdate: fn },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    buttons[0]!.click();
    expect(fn).toHaveBeenCalledWith('2026-05-25');
    expect(fn).not.toHaveBeenCalledWith(today);
  });

  // Regression: when the bottom-nav "Dnes" tab is clicked from a non-today
  // page, the route changes but the DayStrip is not remounted. The scroll
  // position must update to keep the newly-selected cell visible — a stale
  // scroll position would leave today offscreen and only "selected" in markup.
  it('rerenders cells when the selected date changes (selection follows the strip)', async () => {
    const initialCells: DayStripCell[] = [
      cell('2026-06-08'),
      cell('2026-06-09', { isSelected: true }),
      cell(today, { isToday: true }),
    ];
    const { getAllByTestId, rerender } = render(DayStrip, {
      props: { cells: initialCells, today, onselectdate: vi.fn() },
    });
    await tick();
    expect(getAllByTestId('day-strip-cell')[1]!.getAttribute('aria-current')).toBe('date');

    const updatedCells: DayStripCell[] = [
      cell('2026-06-08'),
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    await rerender({ cells: updatedCells, today, onselectdate: vi.fn() });
    await tick();

    const buttons = getAllByTestId('day-strip-cell');
    expect(buttons[1]!.getAttribute('aria-current')).toBeNull();
    expect(buttons[2]!.getAttribute('aria-current')).toBe('date');
  });
});
