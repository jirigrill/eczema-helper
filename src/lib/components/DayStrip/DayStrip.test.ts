import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import DayStrip from './DayStrip.svelte';
import type { DayStripCell } from './day-strip';

function cell(date: string, partial: Partial<DayStripCell> = {}): DayStripCell {
  return {
    date,
    isSelected: false,
    isToday: false,
    isFuture: false,
    isBeforeStart: false,
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
      cell('2026-06-11', { isFuture: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    expect(getAllByTestId('day-strip-cell')).toHaveLength(4);
  });

  it('the selected cell carries aria-current=date', async () => {
    const cells: DayStripCell[] = [
      cell('2026-06-08'),
      cell('2026-06-09', { isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
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
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    expect(queryByTestId('dnes-pill')).toBeNull();
  });

  it('today cell renders a permanent ring marker', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { getByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    const todayCell = getByTestId('day-strip-cell');
    expect(todayCell.querySelector('[data-testid="day-strip-today-ring"]')).toBeTruthy();
  });

  it('today cell shows a hollow centre dot when todayRecorded is false', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { getByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    const ring = getByTestId('day-strip-today-ring');
    expect(ring.getAttribute('data-recorded')).toBe('false');
  });

  it('today cell shows a filled centre dot when todayRecorded is true', async () => {
    const cells: DayStripCell[] = [cell(today, { isToday: true, isSelected: false })];
    const { getByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: true, onselectdate: vi.fn() },
    });
    await tick();
    const ring = getByTestId('day-strip-today-ring');
    expect(ring.getAttribute('data-recorded')).toBe('true');
  });

  it('clicking any cell calls onselectdate with that cell\'s date — including before-start cells', async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell('2026-05-25', { isBeforeStart: true }),
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: fn },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    buttons[0].click();
    expect(fn).toHaveBeenCalledWith('2026-05-25');
  });

  it('clicking a future cell calls onselectdate with that future date', async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell(today, { isToday: true, isSelected: true }),
      cell('2026-06-11', { isFuture: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: fn },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    buttons[1].click();
    expect(fn).toHaveBeenCalledWith('2026-06-11');
  });

  it('renders future cells faded', async () => {
    const cells: DayStripCell[] = [
      cell(today, { isToday: true, isSelected: true }),
      cell('2026-06-11', { isFuture: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    // Future cell carries the muted/faded class; the non-future today cell does not.
    expect(buttons[1].className).toContain('text-text-muted/50');
    expect(buttons[0].className).not.toContain('text-text-muted/50');
  });

  it('does not jump to today when a before-start cell is clicked (no jump-to-today behavior)', async () => {
    const fn = vi.fn();
    const cells: DayStripCell[] = [
      cell('2026-05-25', { isBeforeStart: true }),
      cell(today, { isToday: true, isSelected: true }),
    ];
    const { getAllByTestId } = render(DayStrip, {
      props: { cells, today, todayRecorded: false, onselectdate: fn },
    });
    await tick();
    const buttons = getAllByTestId('day-strip-cell');
    buttons[0].click();
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
      props: { cells: initialCells, today, todayRecorded: false, onselectdate: vi.fn() },
    });
    await tick();
    expect(getAllByTestId('day-strip-cell')[1].getAttribute('aria-current')).toBe('date');

    const updatedCells: DayStripCell[] = [
      cell('2026-06-08'),
      cell('2026-06-09'),
      cell(today, { isToday: true, isSelected: true }),
    ];
    await rerender({ cells: updatedCells, today, todayRecorded: false, onselectdate: vi.fn() });
    await tick();

    const buttons = getAllByTestId('day-strip-cell');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
    expect(buttons[2].getAttribute('aria-current')).toBe('date');
  });
});
