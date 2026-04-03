import type { FoodLog, FoodCategory } from '$lib/domain/models';

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

// ── Bridging functions: Set<string> keys ↔ FoodLog records ──

function statusKey(categoryId: string, subItemId?: string): string {
  return subItemId ? `${categoryId}:${subItemId}` : categoryId;
}

/**
 * Build eliminated/reintroduced Sets from FoodLog array for a given date.
 * Keys use the format "categoryId" or "categoryId:subItemId".
 * This bridges the domain FoodLog model to the prototype's Set-based draft model.
 */
export function buildStatusSets(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): { eliminated: Set<string>; reintroduced: Set<string> } {
  const eliminated = new Set<string>();
  const reintroduced = new Set<string>();

  for (const cat of categories) {
    if (cat.subItems.length === 0) {
      const status = getFoodStatus(logs, cat.id, date);
      if (status === 'eliminated') eliminated.add(statusKey(cat.id));
      else if (status === 'reintroduced') reintroduced.add(statusKey(cat.id));
    } else {
      for (const si of cat.subItems) {
        const status = getSubItemFoodStatus(logs, cat.id, si.id, date);
        if (status === 'eliminated') eliminated.add(statusKey(cat.id, si.id));
        else if (status === 'reintroduced') reintroduced.add(statusKey(cat.id, si.id));
      }
    }
  }

  return { eliminated, reintroduced };
}

/**
 * Get food status for a specific sub-item (filters on both categoryId and subItemId).
 */
export function getSubItemFoodStatus(
  logs: FoodLog[],
  categoryId: string,
  subItemId: string,
  date: string
): FoodStatus {
  const relevantLogs = logs
    .filter((l) => l.categoryId === categoryId && l.subItemId === subItemId && l.date <= date)
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (relevantLogs.length === 0) return 'neutral';
  return relevantLogs[0].action;
}

/**
 * Count active reintroductions for a given day (for two-color dot indicators).
 */
export function countActiveReintroductions(
  logs: FoodLog[],
  date: string,
  allCategoryIds: string[]
): number {
  return allCategoryIds.filter(
    (categoryId) => getFoodStatus(logs, categoryId, date) === 'reintroduced'
  ).length;
}

/**
 * Get all dates in a range (inclusive).
 */
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Convert draft Sets to FoodLog entries for a date range.
 * This is the bridge between the edit-mode draft model and the persistence layer.
 */
export function applyDraftToRange(
  draftEliminated: Set<string>,
  draftReintroduced: Set<string>,
  dateRange: string[],
  childId: string,
  createdBy: string
): Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> {
  const entries: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> = [];

  for (const date of dateRange) {
    for (const k of draftEliminated) {
      const [categoryId, subItemId] = k.split(':');
      entries.push({
        childId,
        categoryId,
        subItemId: subItemId || undefined,
        date,
        action: 'eliminated',
        createdBy,
      });
    }
    for (const k of draftReintroduced) {
      const [categoryId, subItemId] = k.split(':');
      entries.push({
        childId,
        categoryId,
        subItemId: subItemId || undefined,
        date,
        action: 'reintroduced',
        createdBy,
      });
    }
  }

  return entries;
}

/**
 * Compute the diff between a snapshot and the current draft, then generate
 * FoodLog entries only for items that actually changed. This prevents
 * re-saving unchanged inherited state when editing a date range.
 */
export function applyDraftDiffToRange(
  draftEliminated: Set<string>,
  draftReintroduced: Set<string>,
  snapshotEliminated: Set<string>,
  snapshotReintroduced: Set<string>,
  dateRange: string[],
  childId: string,
  createdBy: string
): Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> {
  const entries: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>> = [];

  // Items newly eliminated (not in snapshot)
  const newEliminated = new Set(
    [...draftEliminated].filter((k) => !snapshotEliminated.has(k))
  );
  // Items newly reintroduced (not in snapshot)
  const newReintroduced = new Set(
    [...draftReintroduced].filter((k) => !snapshotReintroduced.has(k))
  );
  // Items removed from eliminated (were in snapshot, no longer in draft eliminated or reintroduced)
  // These need a 'reintroduced' log to cancel the elimination
  const removedFromEliminated = new Set(
    [...snapshotEliminated].filter(
      (k) => !draftEliminated.has(k) && !draftReintroduced.has(k)
    )
  );
  // Items removed from reintroduced (were in snapshot, no longer in either set)
  // These are going back to neutral — no log needed (absence = neutral in cumulative model)
  // But if they were reintroduced and now eliminated, that's captured by newEliminated

  for (const date of dateRange) {
    for (const k of newEliminated) {
      const [categoryId, subItemId] = k.split(':');
      entries.push({
        childId,
        categoryId,
        subItemId: subItemId || undefined,
        date,
        action: 'eliminated',
        createdBy,
      });
    }
    for (const k of newReintroduced) {
      const [categoryId, subItemId] = k.split(':');
      entries.push({
        childId,
        categoryId,
        subItemId: subItemId || undefined,
        date,
        action: 'reintroduced',
        createdBy,
      });
    }
    for (const k of removedFromEliminated) {
      const [categoryId, subItemId] = k.split(':');
      entries.push({
        childId,
        categoryId,
        subItemId: subItemId || undefined,
        date,
        action: 'reintroduced',
        createdBy,
      });
    }
  }

  return entries;
}

/**
 * Get categories that have any eliminated sub-items/items on a given date.
 */
export function getEliminatedCategories(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): FoodCategory[] {
  return categories.filter((cat) => {
    if (cat.subItems.length === 0) {
      return getFoodStatus(logs, cat.id, date) === 'eliminated';
    }
    return cat.subItems.some(
      (si) => getSubItemFoodStatus(logs, cat.id, si.id, date) === 'eliminated'
    );
  });
}

/**
 * Get categories that have any reintroduced (but not eliminated) sub-items on a given date.
 */
export function getReintroducedCategories(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): FoodCategory[] {
  return categories.filter((cat) => {
    if (cat.subItems.length === 0) {
      return getFoodStatus(logs, cat.id, date) === 'reintroduced';
    }
    const hasReintro = cat.subItems.some(
      (si) => getSubItemFoodStatus(logs, cat.id, si.id, date) === 'reintroduced'
    );
    const hasElim = cat.subItems.some(
      (si) => getSubItemFoodStatus(logs, cat.id, si.id, date) === 'eliminated'
    );
    return hasReintro && !hasElim;
  });
}
