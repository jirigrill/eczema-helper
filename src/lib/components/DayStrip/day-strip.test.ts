import { describe, it, expect } from 'vitest';
import { computeDayStrip } from './day-strip';
import { BUFFER_AFTER_END_DAYS } from '$lib/domain/policy';

describe('computeDayStrip', () => {
  const protocolStart = '2026-06-01';
  const estimatedEnd = '2026-07-15';
  const today = '2026-06-10';

  it('returns a continuous run of cells in ascending date order', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.date > cells[i - 1]!.date).toBe(true);
    }
    expect(cells.length).toBeGreaterThan(7);
  });

  it('includes both today and the selected date', () => {
    const selected = '2026-06-05';
    const { cells } = computeDayStrip({
      selectedDate: selected,
      protocolStart,
      estimatedEnd,
      today,
    });
    expect(cells.some((c) => c.date === today)).toBe(true);
    expect(cells.some((c) => c.date === selected)).toBe(true);
  });

  it('marks today with isToday=true and only that one cell', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.date).toBe(today);
  });

  it('marks the selected date with isSelected=true and only that one cell', () => {
    const selected = '2026-06-05';
    const { cells } = computeDayStrip({
      selectedDate: selected,
      protocolStart,
      estimatedEnd,
      today,
    });
    const sel = cells.filter((c) => c.isSelected);
    expect(sel).toHaveLength(1);
    expect(sel[0]!.date).toBe(selected);
  });

  it('selecting a non-today day keeps today flagged in its own slot (today does not move)', () => {
    const selectedA = today;
    const selectedB = '2026-06-05';
    const stripA = computeDayStrip({ selectedDate: selectedA, protocolStart, estimatedEnd, today });
    const stripB = computeDayStrip({ selectedDate: selectedB, protocolStart, estimatedEnd, today });
    const todayIndexA = stripA.cells.findIndex((c) => c.isToday);
    const todayIndexB = stripB.cells.findIndex((c) => c.isToday);
    expect(todayIndexA).toBe(todayIndexB);
    // today's cell still flagged with isToday in B even when not selected
    expect(stripB.cells[todayIndexB]!.isToday).toBe(true);
    expect(stripB.cells[todayIndexB]!.isSelected).toBe(false);
  });

  it('marks dates strictly after today with isFuture=true', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    const future = cells.filter((c) => c.date > today);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((c) => c.isFuture)).toBe(true);
    expect(cells.find((c) => c.date === today)?.isFuture).toBe(false);
  });

  it('marks dates strictly before protocolStart with isBeforeStart=true', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    const beforeStart = cells.filter((c) => c.date < protocolStart);
    expect(beforeStart.length).toBeGreaterThan(0);
    expect(beforeStart.every((c) => c.isBeforeStart)).toBe(true);
    expect(cells.find((c) => c.date === protocolStart)?.isBeforeStart).toBe(false);
  });

  it('soft-clamps the range to a small buffer before protocolStart', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    // Earliest cell must not be more than a small buffer before protocolStart.
    expect(cells[0]!.date < protocolStart).toBe(true);
    // But the buffer is bounded — earliest cell should be within ~14 days before start.
    const earliest = new Date(cells[0]!.date + 'T00:00:00').getTime();
    const start = new Date(protocolStart + 'T00:00:00').getTime();
    expect((start - earliest) / 86400000).toBeLessThanOrEqual(14);
  });

  it('soft-clamps the range to the buffer after estimatedEnd', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    expect(cells[cells.length - 1]!.date > estimatedEnd).toBe(true);
    const latest = new Date(cells[cells.length - 1]!.date + 'T00:00:00').getTime();
    const end = new Date(estimatedEnd + 'T00:00:00').getTime();
    expect((latest - end) / 86400000).toBeLessThanOrEqual(BUFFER_AFTER_END_DAYS);
  });

  it('extends the range to cover selectedDate even if it falls outside the soft-clamp', () => {
    // Far-past selected date should still appear in the strip.
    const farPast = '2025-12-01';
    const { cells } = computeDayStrip({
      selectedDate: farPast,
      protocolStart,
      estimatedEnd,
      today,
    });
    expect(cells.some((c) => c.date === farPast)).toBe(true);
    expect(cells.find((c) => c.date === farPast)?.isBeforeStart).toBe(true);
  });

  it('flag precedence: a cell that is both today and selected has both flags set', () => {
    const { cells } = computeDayStrip({ selectedDate: today, protocolStart, estimatedEnd, today });
    const todayCell = cells.find((c) => c.date === today);
    expect(todayCell?.isSelected).toBe(true);
    expect(todayCell?.isToday).toBe(true);
  });
});
