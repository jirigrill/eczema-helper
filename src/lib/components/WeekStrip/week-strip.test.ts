import { describe, it, expect } from 'vitest';
import { computeWeekStrip } from './week-strip';

describe('computeWeekStrip', () => {
  const protocolStart = '2025-06-01';
  const today = '2025-06-10';

  it('returns exactly 7 cells', () => {
    const { cells } = computeWeekStrip(today, protocolStart, today);
    expect(cells).toHaveLength(7);
  });

  it('selected day is the rightmost cell (index 6)', () => {
    const { cells, selectedIndex } = computeWeekStrip(today, protocolStart, today);
    expect(cells[6].date).toBe(today);
    expect(selectedIndex).toBe(6);
  });

  it('cells are in ascending date order', () => {
    const { cells } = computeWeekStrip(today, protocolStart, today);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].date > cells[i - 1].date).toBe(true);
    }
  });

  it('showDnesPill is false when selectedDate equals today', () => {
    const { showDnesPill } = computeWeekStrip(today, protocolStart, today);
    expect(showDnesPill).toBe(false);
  });

  it('showDnesPill is true when selectedDate is not today', () => {
    const past = '2025-06-08';
    const { showDnesPill } = computeWeekStrip(past, protocolStart, today);
    expect(showDnesPill).toBe(true);
  });

  it('canPageBack is true when window does not reach protocolStart', () => {
    // today = 2025-06-10, so leftmost = 2025-06-04; protocolStart = 2025-06-01 — can page back
    const { canPageBack } = computeWeekStrip(today, protocolStart, today);
    expect(canPageBack).toBe(true);
  });

  it('canPageBack is false when leftmost cell is at protocolStart', () => {
    // selectedDate = protocolStart + 6 days = 2025-06-07 → leftmost = protocolStart
    const selected = '2025-06-07';
    const { canPageBack } = computeWeekStrip(selected, protocolStart, today);
    expect(canPageBack).toBe(false);
  });

  it('canPageBack is false when window would go before protocolStart', () => {
    // selectedDate close to protocolStart
    const selected = '2025-06-03';
    const { canPageBack } = computeWeekStrip(selected, protocolStart, today);
    expect(canPageBack).toBe(false);
  });

  it('when selectedDate is close to protocolStart, leftmost may be before it', () => {
    // The strip always returns 7 cells; it does not clamp the window.
    // Cells before protocolStart are marked isBeforeStart so the UI can dim them.
    const veryEarly = '2025-06-02';
    const { cells } = computeWeekStrip(veryEarly, protocolStart, today);
    expect(cells).toHaveLength(7);
    expect(cells[6].date).toBe(veryEarly);
  });

  it('cells outside protocol range are marked as before-start', () => {
    const veryEarly = '2025-06-02';
    const { cells } = computeWeekStrip(veryEarly, protocolStart, today);
    const beforeStart = cells.filter((c) => c.date < protocolStart);
    expect(beforeStart.every((c) => c.isBeforeStart)).toBe(true);
  });

  it('cells after today are not included (selectedDate cannot exceed today)', () => {
    // even if caller passes a future date, strip should not go past today
    const { cells } = computeWeekStrip(today, protocolStart, today);
    expect(cells.every((c) => c.date <= today)).toBe(true);
  });
});
