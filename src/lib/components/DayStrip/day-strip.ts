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

/** The strip always reaches this many days on either side of today. */
const WINDOW_DAYS = 7;

/**
 * Returns a continuous list of day cells spanning the mother's history back to
 * the earliest logged day and a fixed week into the future (issue #654):
 *
 *   [ min(today − 7d, earliestLogged, selectedDate) … max(today + 7d, selectedDate) ]
 *
 * With nothing logged the strip is a symmetric 15-cell window (today ± 7d). The
 * ±7d floor always applies; logged data only ever *extends* the past edge
 * outward, never shrinks the default window. The future edge is fixed at
 * today + 7d — future-dated entries do not push it further. The past edge
 * reaches the earlier of today − 7d and the earliest logged day. Clamping both
 * ends to `selectedDate` keeps a directly-navigated out-of-range day rendering
 * its own cell (EC-1/EC-2).
 *
 * Selecting a different day flags it via `isSelected` — the strip itself does
 * not reshuffle around the selection. `today` carries `isToday` in its own slot
 * regardless of selection.
 */
export function computeDayStrip(input: ComputeDayStripInput): DayStrip {
  const { selectedDate, earliestLogged, today } = input;

  const windowStart = addDays(today, -WINDOW_DAYS);

  // Past edge: earlier of the ±7d floor and the earliest logged day, then
  // clamped further back to a directly-navigated day before it.
  let start =
    earliestLogged !== null && earliestLogged < windowStart ? earliestLogged : windowStart;
  if (selectedDate < start) start = selectedDate;

  // Future edge: a fixed week past today, then clamped further forward to a
  // directly-navigated day after it.
  let end = addDays(today, WINDOW_DAYS);
  if (selectedDate > end) end = selectedDate;

  const cells: DayStripCell[] = [];
  let cursor = start;
  while (cursor <= end) {
    cells.push({
      date: cursor,
      isSelected: cursor === selectedDate,
      isToday: cursor === today,
    });
    cursor = addDays(cursor, 1);
  }

  return { cells };
}
