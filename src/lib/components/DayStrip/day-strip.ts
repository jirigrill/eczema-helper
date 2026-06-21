import { addDays } from '$lib/utils/date';

const BUFFER_BEFORE_START_DAYS = 7;
const BUFFER_AFTER_END_DAYS = 7;

export type DayStripCell = {
  date: string;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
  isBeforeStart: boolean;
};

export type DayStrip = {
  cells: DayStripCell[];
};

export type ComputeDayStripInput = {
  selectedDate: string;
  protocolStart: string;
  estimatedEnd: string;
  today: string;
};

/**
 * Returns a continuous list of day cells spanning a small buffer before
 * `protocolStart` through `estimatedEnd` plus a small buffer. The range is
 * extended (but not contracted) so it always covers `today` and `selectedDate`.
 *
 * Selecting a different day flags it via `isSelected` — the strip itself does
 * not reshuffle around the selection. `today` carries `isToday` in its own slot
 * regardless of selection.
 */
export function computeDayStrip(input: ComputeDayStripInput): DayStrip {
  const { selectedDate, protocolStart, estimatedEnd, today } = input;

  const earliestSoftClamp = addDays(protocolStart, -BUFFER_BEFORE_START_DAYS);
  const latestSoftClamp = addDays(estimatedEnd, BUFFER_AFTER_END_DAYS);

  const earliest =
    selectedDate < earliestSoftClamp ? selectedDate : earliestSoftClamp;
  const latest =
    selectedDate > latestSoftClamp
      ? selectedDate
      : today > latestSoftClamp
        ? today
        : latestSoftClamp;

  const cells: DayStripCell[] = [];
  let cursor = earliest;
  while (cursor <= latest) {
    cells.push({
      date: cursor,
      isSelected: cursor === selectedDate,
      isToday: cursor === today,
      isFuture: cursor > today,
      isBeforeStart: cursor < protocolStart,
    });
    cursor = addDays(cursor, 1);
  }

  return { cells };
}
