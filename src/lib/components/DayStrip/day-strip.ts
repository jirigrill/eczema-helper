import { addDays } from '$lib/utils/date';

export type DayStripCell = {
  date: string;
  isSelected: boolean;
  isToday: boolean;
};

export type DayStrip = {
  cells: DayStripCell[];
};

export type ComputeDayStripInput = {
  selectedDate: string;
  /** Earliest date (ISO) with anything logged, or null when nothing is logged. */
  earliestLogged: string | null;
  today: string;
};

/**
 * Returns a continuous list of day cells spanning the mother's history rather
 * than a plan: `min(earliestLogged ?? today, selectedDate) … today`, with no
 * future cells. With nothing logged the strip is the single cell `today`.
 * Clamping the start to `selectedDate` keeps a directly-navigated out-of-range
 * day rendering its own cell.
 *
 * Selecting a different day flags it via `isSelected` — the strip itself does
 * not reshuffle around the selection. `today` carries `isToday` in its own slot
 * regardless of selection.
 */
export function computeDayStrip(input: ComputeDayStripInput): DayStrip {
  const { selectedDate, earliestLogged, today } = input;

  const rangeStartFromLog = earliestLogged ?? today;
  const earliest = selectedDate < rangeStartFromLog ? selectedDate : rangeStartFromLog;

  const cells: DayStripCell[] = [];
  let cursor = earliest;
  while (cursor <= today) {
    cells.push({
      date: cursor,
      isSelected: cursor === selectedDate,
      isToday: cursor === today,
    });
    cursor = addDays(cursor, 1);
  }

  return { cells };
}
