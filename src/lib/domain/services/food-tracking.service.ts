import type { FoodLog, FoodCategory } from '$lib/domain/models';

export type FoodStatus = 'neutral' | 'eliminated' | 'reintroduced';

function statusKey(categoryId: string, subItemId?: string): string {
  return subItemId ? `${categoryId}:${subItemId}` : categoryId;
}

// ── Per-date functions (exact date match, no carry-forward) ──

/**
 * Get food status for a category on an exact date only.
 */
export function getExactDateFoodStatus(
  logs: FoodLog[],
  categoryId: string,
  date: string
): FoodStatus {
  const relevantLogs = logs
    .filter((l) => l.categoryId === categoryId && !l.subItemId && l.date === date)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (relevantLogs.length === 0) return 'neutral';
  return relevantLogs[0].action;
}

/**
 * Get food status for a specific sub-item on an exact date only.
 */
export function getExactDateSubItemStatus(
  logs: FoodLog[],
  categoryId: string,
  subItemId: string,
  date: string
): FoodStatus {
  const relevantLogs = logs
    .filter((l) => l.categoryId === categoryId && l.subItemId === subItemId && l.date === date)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (relevantLogs.length === 0) return 'neutral';
  return relevantLogs[0].action;
}

/**
 * Check if a date has any eliminations (exact date match).
 */
export function dateHasEliminations(logs: FoodLog[], date: string): boolean {
  return logs.some((l) => l.date === date && l.action === 'eliminated');
}

/**
 * Check if a date has any reintroductions (exact date match).
 */
export function dateHasReintroductions(logs: FoodLog[], date: string): boolean {
  return logs.some((l) => l.date === date && l.action === 'reintroduced');
}

/**
 * Build eliminated/reintroduced Sets from FoodLog array for an exact date.
 * Keys use the format "categoryId" or "categoryId:subItemId".
 */
export function buildExactDateStatusSets(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): { eliminated: Set<string>; reintroduced: Set<string> } {
  const eliminated = new Set<string>();
  const reintroduced = new Set<string>();

  for (const cat of categories) {
    if (cat.subItems.length === 0) {
      const status = getExactDateFoodStatus(logs, cat.id, date);
      if (status === 'eliminated') eliminated.add(statusKey(cat.id));
      else if (status === 'reintroduced') reintroduced.add(statusKey(cat.id));
    } else {
      for (const si of cat.subItems) {
        const status = getExactDateSubItemStatus(logs, cat.id, si.id, date);
        if (status === 'eliminated') eliminated.add(statusKey(cat.id, si.id));
        else if (status === 'reintroduced') reintroduced.add(statusKey(cat.id, si.id));
      }
    }
  }

  return { eliminated, reintroduced };
}

export type CategoryWithItems = {
  category: FoodCategory;
  items: Array<{ id: string; nameCs: string }>;
};

/**
 * Get categories with their specific eliminated sub-items for an exact date.
 */
export function getExactDateEliminatedDetails(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): CategoryWithItems[] {
  const result: CategoryWithItems[] = [];

  for (const cat of categories) {
    if (cat.subItems.length === 0) {
      if (getExactDateFoodStatus(logs, cat.id, date) === 'eliminated') {
        result.push({ category: cat, items: [] });
      }
    } else {
      const elimItems = cat.subItems.filter(
        (si) => getExactDateSubItemStatus(logs, cat.id, si.id, date) === 'eliminated'
      );
      if (elimItems.length > 0) {
        result.push({
          category: cat,
          items: elimItems.map((si) => ({ id: si.id, nameCs: si.nameCs })),
        });
      }
    }
  }

  return result;
}

/**
 * Get categories with their specific reintroduced sub-items for an exact date.
 */
export function getExactDateReintroducedDetails(
  logs: FoodLog[],
  date: string,
  categories: FoodCategory[]
): CategoryWithItems[] {
  const result: CategoryWithItems[] = [];

  for (const cat of categories) {
    if (cat.subItems.length === 0) {
      if (getExactDateFoodStatus(logs, cat.id, date) === 'reintroduced') {
        result.push({ category: cat, items: [] });
      }
    } else {
      const reintroItems = cat.subItems.filter(
        (si) => getExactDateSubItemStatus(logs, cat.id, si.id, date) === 'reintroduced'
      );
      if (reintroItems.length > 0) {
        result.push({
          category: cat,
          items: reintroItems.map((si) => ({ id: si.id, nameCs: si.nameCs })),
        });
      }
    }
  }

  return result;
}

// ── Bridging: Set<string> keys ↔ FoodLog records ──

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
