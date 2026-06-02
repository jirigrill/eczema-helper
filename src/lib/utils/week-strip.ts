import { addDays } from '$lib/utils/date';

export type WeekStripCell = {
  date: string;
  isSelected: boolean;
  isBeforeStart: boolean;
};

export type WeekStrip = {
  cells: WeekStripCell[];
  selectedIndex: number;
  canPageBack: boolean;
  showDnesPill: boolean;
};

/**
 * Returns a 7-cell sliding window with selectedDate at the right edge (index 6).
 * Cells may be before protocolStart (marked isBeforeStart) but never after today.
 */
export function computeWeekStrip(
  selectedDate: string,
  protocolStart: string,
  today: string,
): WeekStrip {
  const cells: WeekStripCell[] = [];
  for (let i = -6; i <= 0; i++) {
    const date = addDays(selectedDate, i);
    cells.push({
      date,
      isSelected: i === 0,
      isBeforeStart: date < protocolStart,
    });
  }

  const leftmostDate = cells[0].date;

  return {
    cells,
    selectedIndex: 6,
    canPageBack: leftmostDate > protocolStart,
    showDnesPill: selectedDate !== today,
  };
}
