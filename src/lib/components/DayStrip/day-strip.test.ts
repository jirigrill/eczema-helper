import { describe, expect, it } from 'vitest';

import { computeDayStrip } from './day-strip';

describe('computeDayStrip', () => {
  const today = '2026-06-10';

  it('spans from the earliest logged day through today', () => {
    const { cells } = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    expect(cells[0]!.date).toBe('2026-06-01');
    expect(cells[cells.length - 1]!.date).toBe(today);
  });

  it('returns a continuous run of cells in ascending date order', () => {
    const { cells } = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.date > cells[i - 1]!.date).toBe(true);
    }
  });

  it('renders the single cell today when nothing is logged', () => {
    const { cells } = computeDayStrip({ selectedDate: today, earliestLogged: null, today });
    expect(cells).toHaveLength(1);
    expect(cells[0]!.date).toBe(today);
    expect(cells[0]!.isToday).toBe(true);
  });

  it('renders no cell past today', () => {
    const { cells } = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    expect(cells.every((c) => c.date <= today)).toBe(true);
  });

  it('marks today with isToday=true and only that one cell', () => {
    const { cells } = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.date).toBe(today);
  });

  it('marks the selected date with isSelected=true and only that one cell', () => {
    const selected = '2026-06-05';
    const { cells } = computeDayStrip({
      selectedDate: selected,
      earliestLogged: '2026-06-01',
      today,
    });
    const sel = cells.filter((c) => c.isSelected);
    expect(sel).toHaveLength(1);
    expect(sel[0]!.date).toBe(selected);
  });

  it('selecting a non-today day keeps today flagged in its own slot (today does not move)', () => {
    const stripA = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    const stripB = computeDayStrip({
      selectedDate: '2026-06-05',
      earliestLogged: '2026-06-01',
      today,
    });
    const todayIndexA = stripA.cells.findIndex((c) => c.isToday);
    const todayIndexB = stripB.cells.findIndex((c) => c.isToday);
    expect(todayIndexA).toBe(todayIndexB);
    expect(stripB.cells[todayIndexB]!.isToday).toBe(true);
    expect(stripB.cells[todayIndexB]!.isSelected).toBe(false);
  });

  it('extends the range back to selectedDate when it precedes the earliest logged day', () => {
    // A directly-navigated day earlier than any log still renders its own cell.
    const { cells } = computeDayStrip({
      selectedDate: '2026-05-20',
      earliestLogged: '2026-06-01',
      today,
    });
    expect(cells[0]!.date).toBe('2026-05-20');
    expect(cells.some((c) => c.date === '2026-06-01')).toBe(true);
    expect(cells.some((c) => c.isSelected && c.date === '2026-05-20')).toBe(true);
  });

  it('extends the range back to selectedDate when nothing is logged', () => {
    const { cells } = computeDayStrip({ selectedDate: '2026-05-20', earliestLogged: null, today });
    expect(cells[0]!.date).toBe('2026-05-20');
    expect(cells[cells.length - 1]!.date).toBe(today);
  });

  it('starts at the earliest logged day when it precedes the selected date', () => {
    const { cells } = computeDayStrip({
      selectedDate: '2026-06-08',
      earliestLogged: '2026-06-01',
      today,
    });
    expect(cells[0]!.date).toBe('2026-06-01');
  });

  it('flag precedence: a cell that is both today and selected has both flags set', () => {
    const { cells } = computeDayStrip({
      selectedDate: today,
      earliestLogged: '2026-06-01',
      today,
    });
    const todayCell = cells.find((c) => c.date === today);
    expect(todayCell?.isSelected).toBe(true);
    expect(todayCell?.isToday).toBe(true);
  });

  it('the cell shape is date/isSelected/isToday only', () => {
    const { cells } = computeDayStrip({ selectedDate: today, earliestLogged: null, today });
    expect(Object.keys(cells[0]!).sort()).toEqual(['date', 'isSelected', 'isToday']);
  });
});
