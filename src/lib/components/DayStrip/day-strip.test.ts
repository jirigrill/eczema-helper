import { describe, expect, it } from 'vitest';

import { computeDayStrip } from './day-strip';

describe('computeDayStrip', () => {
  const today = '2026-06-10';
  const base = { selectedDate: today, earliestLogged: null, today };

  // ── US-1: fresh install ──────────────────────────────────────
  it('renders exactly today ± 7 days (15 cells) when nothing is logged', () => {
    const { cells } = computeDayStrip(base);
    expect(cells).toHaveLength(15);
    expect(cells[0]!.date).toBe('2026-06-03');
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17');
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(cells.find((c) => c.isToday)!.date).toBe(today);
  });

  it('returns a continuous run of cells in strictly ascending date order', () => {
    const { cells } = computeDayStrip({ ...base, earliestLogged: '2026-06-01' });
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.date > cells[i - 1]!.date).toBe(true);
    }
  });

  // ── US-2: only past data ─────────────────────────────────────
  it('past-only data: past edge reaches earliest, future edge stays at today + 7d', () => {
    // first logged 2026-06-01 (earlier than today − 7d = 2026-06-03) →
    // future edge = today + 7d.
    const { cells } = computeDayStrip({
      ...base,
      earliestLogged: '2026-06-01',
    });
    expect(cells[0]!.date).toBe('2026-06-01');
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17'); // today + 7d
  });

  // ── US-4: floor always applies; future edge is fixed at today + 7d ──
  // The ±7d window is a floor, never a ceiling: past data never shrinks it, and
  // the future edge is always exactly today + 7d — logged data never pushes it.
  it('data within ±7d does not shrink the default window; future edge is today + 7d', () => {
    const { cells } = computeDayStrip({
      ...base,
      earliestLogged: '2026-06-08', // today − 2d, inside the past floor
    });
    expect(cells[0]!.date).toBe('2026-06-03'); // today − 7d (floor, not shrunk)
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17'); // today + 7d
  });

  // ── US-5: today ring regardless of data ──────────────────────
  it('marks today with isToday=true and only that one cell', () => {
    const { cells } = computeDayStrip({ ...base, earliestLogged: '2026-06-01' });
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.date).toBe(today);
  });

  it('marks the selected date with isSelected=true and only that one cell', () => {
    const selected = '2026-06-05';
    const { cells } = computeDayStrip({ ...base, selectedDate: selected });
    const sel = cells.filter((c) => c.isSelected);
    expect(sel).toHaveLength(1);
    expect(sel[0]!.date).toBe(selected);
  });

  it('selecting a non-today day keeps today flagged in its own slot (today does not move)', () => {
    const stripA = computeDayStrip(base);
    const stripB = computeDayStrip({ ...base, selectedDate: '2026-06-05' });
    const todayIndexA = stripA.cells.findIndex((c) => c.isToday);
    const todayIndexB = stripB.cells.findIndex((c) => c.isToday);
    expect(todayIndexA).toBe(todayIndexB);
    expect(stripB.cells[todayIndexB]!.isToday).toBe(true);
    expect(stripB.cells[todayIndexB]!.isSelected).toBe(false);
  });

  // ── EC-1: URL nav before the span ────────────────────────────
  it('extends the range back to selectedDate when it precedes the past edge', () => {
    const { cells } = computeDayStrip({ ...base, selectedDate: '2026-05-20' });
    expect(cells[0]!.date).toBe('2026-05-20');
    expect(cells.some((c) => c.isSelected && c.date === '2026-05-20')).toBe(true);
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17'); // still today + 7d
  });

  // ── EC-2: URL nav after the span ─────────────────────────────
  it('extends the range forward to selectedDate when it follows the future edge', () => {
    const { cells } = computeDayStrip({ ...base, selectedDate: '2026-07-15' });
    expect(cells[0]!.date).toBe('2026-06-03'); // today − 7d
    expect(cells[cells.length - 1]!.date).toBe('2026-07-15');
    expect(cells.some((c) => c.isSelected && c.date === '2026-07-15')).toBe(true);
  });

  // ── EC-3: single logged day ──────────────────────────────────
  it('single logged day: no duplicate or missing cells, future edge at today + 7d', () => {
    const day = '2026-05-25';
    const { cells } = computeDayStrip({
      ...base,
      earliestLogged: day,
    });
    expect(cells[0]!.date).toBe('2026-05-25'); // min(today − 7d, day)
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17'); // today + 7d
    const dates = cells.map((c) => c.date);
    expect(new Set(dates).size).toBe(dates.length); // no duplicates
  });

  // ── EC-4: very old data / large span ─────────────────────────
  it('very old data renders the full contiguous span with no cap', () => {
    const { cells } = computeDayStrip({ ...base, earliestLogged: '2026-01-01' });
    expect(cells[0]!.date).toBe('2026-01-01');
    expect(cells[cells.length - 1]!.date).toBe('2026-06-17');
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.date > cells[i - 1]!.date).toBe(true);
    }
  });

  // ── EC-5: month / year boundary crossing ─────────────────────
  it('crosses a year boundary with consecutive dates and no off-by-one', () => {
    const { cells } = computeDayStrip({
      selectedDate: '2025-12-28',
      earliestLogged: '2025-12-28',
      today: '2026-01-04',
    });
    const dates = cells.map((c) => c.date);
    expect(dates).toContain('2025-12-31');
    expect(dates).toContain('2026-01-01');
    const nyeIndex = dates.indexOf('2025-12-31');
    expect(dates[nyeIndex + 1]).toBe('2026-01-01');
  });

  // ── flag shape ───────────────────────────────────────────────
  it('flag precedence: a cell that is both today and selected has both flags set', () => {
    const { cells } = computeDayStrip({ ...base, earliestLogged: '2026-06-01' });
    const todayCell = cells.find((c) => c.date === today);
    expect(todayCell?.isSelected).toBe(true);
    expect(todayCell?.isToday).toBe(true);
  });

  it('the cell shape is date/isSelected/isToday only', () => {
    const { cells } = computeDayStrip(base);
    expect(Object.keys(cells[0]!).sort()).toEqual(['date', 'isSelected', 'isToday']);
  });
});
