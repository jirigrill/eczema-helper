import type { FoodLog } from '$lib/domain/models';

export type FoodStatus = 'neutral' | 'eliminated' | 'reintroduced';

/**
 * Cumulative elimination state: returns the most recent FoodLog action
 * for the given category on or before the given date. If no log exists
 * for that category before the date, the food is considered "neutral"
 * (neither eliminated nor reintroduced).
 */
export function getFoodStatus(
  logs: FoodLog[],
  categoryId: string,
  date: string
): FoodStatus {
  const relevantLogs = logs
    .filter((l) => l.categoryId === categoryId && l.date <= date)
    .sort((a, b) => {
      // Sort by date descending, then by createdAt descending
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (relevantLogs.length === 0) return 'neutral';
  return relevantLogs[0].action;
}

/**
 * Compute the next status in the toggle cycle:
 * neutral -> eliminated -> reintroduced -> neutral
 */
export function getNextStatus(current: FoodStatus): FoodStatus {
  const cycle: FoodStatus[] = ['neutral', 'eliminated', 'reintroduced'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

/**
 * Count active eliminations for a given day.
 * An item is "actively eliminated" if the most recent log entry
 * on or before the given date has action = 'eliminated'.
 */
export function countActiveEliminations(
  logs: FoodLog[],
  date: string,
  allCategoryIds: string[]
): number {
  return allCategoryIds.filter(
    (categoryId) => getFoodStatus(logs, categoryId, date) === 'eliminated'
  ).length;
}

/**
 * Determine the dot colour tier for a day based on elimination count.
 */
export function getDotTier(
  eliminationCount: number
): 'none' | 'low' | 'medium' | 'high' {
  if (eliminationCount === 0) return 'none';
  if (eliminationCount <= 3) return 'low';
  if (eliminationCount <= 6) return 'medium';
  return 'high';
}

/**
 * Get the previous calendar date as an ISO string.
 */
export function getPreviousDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return d.toISOString().split('T')[0];
}

/**
 * Generate food log entries to copy yesterday's state to today.
 * Returns an array of new FoodLog entries (without id, createdAt, updatedAt) to be created.
 */
export function copyFromYesterday(
  allLogs: FoodLog[],
  childId: string,
  todayDate: string,
  allCategoryIds: string[],
  createdBy: string
): Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> {
  const newEntries: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> = [];
  const yesterdayDate = getPreviousDate(todayDate);

  for (const categoryId of allCategoryIds) {
    const status = getFoodStatus(allLogs, categoryId, yesterdayDate);
    if (status !== 'neutral') {
      newEntries.push({
        childId,
        categoryId,
        date: todayDate,
        action: status,
        createdBy,
      });
    }
  }

  return newEntries;
}

/**
 * Check if a date has any food logs (for "copy from yesterday" button state).
 */
export function hasLogsForDate(logs: FoodLog[], date: string): boolean {
  return logs.some((l) => l.date === date);
}

/**
 * Get the most recent food log for undo functionality.
 */
export function getMostRecentLog(
  logs: FoodLog[],
  categoryId: string,
  date: string
): FoodLog | undefined {
  return logs
    .filter((l) => l.categoryId === categoryId && l.date === date)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}
