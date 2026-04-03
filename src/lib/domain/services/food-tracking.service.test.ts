import { describe, it, expect } from 'vitest';
import {
  getFoodStatus,
  getNextStatus,
  countActiveEliminations,
  countActiveReintroductions,
  getDotTier,
  getPreviousDate,
  copyFromYesterday,
  hasLogsForDate,
  getMostRecentLog,
  buildStatusSets,
  getSubItemFoodStatus,
  getDatesInRange,
  applyDraftToRange,
  applyDraftDiffToRange,
  getEliminatedCategories,
  getReintroducedCategories,
} from './food-tracking.service';
import type { FoodLog, FoodCategory } from '$lib/domain/models';

function createLog(overrides: Partial<FoodLog> = {}): FoodLog {
  return {
    id: crypto.randomUUID(),
    childId: 'child-1',
    date: '2026-03-15',
    categoryId: 'dairy',
    action: 'eliminated',
    createdBy: 'user-1',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
    ...overrides,
  };
}

describe('food-tracking.service', () => {
  describe('getFoodStatus', () => {
    it('returns neutral when no logs exist', () => {
      const result = getFoodStatus([], 'dairy', '2026-03-15');
      expect(result).toBe('neutral');
    });

    it('returns eliminated after elimination log', () => {
      const logs = [createLog({ action: 'eliminated' })];
      const result = getFoodStatus(logs, 'dairy', '2026-03-15');
      expect(result).toBe('eliminated');
    });

    it('returns reintroduced after reintroduction log', () => {
      const logs = [createLog({ action: 'reintroduced' })];
      const result = getFoodStatus(logs, 'dairy', '2026-03-15');
      expect(result).toBe('reintroduced');
    });

    it('returns the most recent action when multiple logs exist', () => {
      const logs = [
        createLog({ date: '2026-03-14', action: 'eliminated', createdAt: '2026-03-14T10:00:00Z' }),
        createLog({ date: '2026-03-15', action: 'reintroduced', createdAt: '2026-03-15T10:00:00Z' }),
      ];
      const result = getFoodStatus(logs, 'dairy', '2026-03-15');
      expect(result).toBe('reintroduced');
    });

    it('filters by date - ignores future logs', () => {
      const logs = [
        createLog({ date: '2026-03-14', action: 'eliminated' }),
        createLog({ date: '2026-03-16', action: 'reintroduced' }),
      ];
      const result = getFoodStatus(logs, 'dairy', '2026-03-15');
      expect(result).toBe('eliminated');
    });

    it('filters by categoryId', () => {
      const logs = [
        createLog({ categoryId: 'dairy', action: 'eliminated' }),
        createLog({ categoryId: 'eggs', action: 'reintroduced' }),
      ];
      expect(getFoodStatus(logs, 'dairy', '2026-03-15')).toBe('eliminated');
      expect(getFoodStatus(logs, 'eggs', '2026-03-15')).toBe('reintroduced');
      expect(getFoodStatus(logs, 'wheat', '2026-03-15')).toBe('neutral');
    });

    it('uses createdAt as tiebreaker for same date', () => {
      const logs = [
        createLog({ action: 'eliminated', createdAt: '2026-03-15T10:00:00Z' }),
        createLog({ action: 'reintroduced', createdAt: '2026-03-15T11:00:00Z' }),
      ];
      const result = getFoodStatus(logs, 'dairy', '2026-03-15');
      expect(result).toBe('reintroduced');
    });
  });

  describe('getNextStatus', () => {
    it('cycles neutral -> eliminated', () => {
      expect(getNextStatus('neutral')).toBe('eliminated');
    });

    it('cycles eliminated -> reintroduced', () => {
      expect(getNextStatus('eliminated')).toBe('reintroduced');
    });

    it('cycles reintroduced -> neutral', () => {
      expect(getNextStatus('reintroduced')).toBe('neutral');
    });
  });

  describe('countActiveEliminations', () => {
    it('returns 0 for no logs', () => {
      const result = countActiveEliminations([], '2026-03-15', ['dairy', 'eggs', 'wheat']);
      expect(result).toBe(0);
    });

    it('counts only eliminated items', () => {
      const logs = [
        createLog({ categoryId: 'dairy', action: 'eliminated' }),
        createLog({ categoryId: 'eggs', action: 'reintroduced' }),
      ];
      const result = countActiveEliminations(logs, '2026-03-15', ['dairy', 'eggs', 'wheat']);
      expect(result).toBe(1);
    });

    it('handles multiple eliminated items correctly', () => {
      const logs = [
        createLog({ categoryId: 'dairy', action: 'eliminated' }),
        createLog({ categoryId: 'eggs', action: 'eliminated' }),
        createLog({ categoryId: 'wheat', action: 'eliminated' }),
        createLog({ categoryId: 'soy', action: 'reintroduced' }),
        createLog({ categoryId: 'nuts', action: 'eliminated' }),
      ];
      const allCategories = ['dairy', 'eggs', 'wheat', 'soy', 'nuts', 'fish'];
      const result = countActiveEliminations(logs, '2026-03-15', allCategories);
      expect(result).toBe(4);
    });
  });

  describe('getDotTier', () => {
    it('returns none for 0', () => {
      expect(getDotTier(0)).toBe('none');
    });

    it('returns low for 1-3', () => {
      expect(getDotTier(1)).toBe('low');
      expect(getDotTier(2)).toBe('low');
      expect(getDotTier(3)).toBe('low');
    });

    it('returns medium for 4-6', () => {
      expect(getDotTier(4)).toBe('medium');
      expect(getDotTier(5)).toBe('medium');
      expect(getDotTier(6)).toBe('medium');
    });

    it('returns high for 7+', () => {
      expect(getDotTier(7)).toBe('high');
      expect(getDotTier(10)).toBe('high');
      expect(getDotTier(20)).toBe('high');
    });
  });

  describe('getPreviousDate', () => {
    it('computes correctly for normal day', () => {
      expect(getPreviousDate('2026-03-15')).toBe('2026-03-14');
    });

    it('computes correctly across month boundary', () => {
      expect(getPreviousDate('2026-03-01')).toBe('2026-02-28');
    });

    it('computes correctly for leap year', () => {
      expect(getPreviousDate('2024-03-01')).toBe('2024-02-29');
    });

    it('computes correctly across year boundary', () => {
      expect(getPreviousDate('2026-01-01')).toBe('2025-12-31');
    });
  });

  describe('copyFromYesterday', () => {
    const allCategories = ['dairy', 'eggs', 'wheat', 'soy'];

    it('returns empty array when yesterday has no entries', () => {
      const result = copyFromYesterday([], 'child-1', '2026-03-15', allCategories, 'user-1');
      expect(result).toHaveLength(0);
    });

    it('copies eliminated items from yesterday', () => {
      const logs = [
        createLog({ date: '2026-03-14', categoryId: 'dairy', action: 'eliminated' }),
        createLog({ date: '2026-03-14', categoryId: 'eggs', action: 'eliminated' }),
      ];
      const result = copyFromYesterday(logs, 'child-1', '2026-03-15', allCategories, 'user-1');
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.date === '2026-03-15')).toBe(true);
      expect(result.every((e) => e.action === 'eliminated')).toBe(true);
    });

    it('copies reintroduced items from yesterday', () => {
      const logs = [
        createLog({ date: '2026-03-14', categoryId: 'dairy', action: 'reintroduced' }),
      ];
      const result = copyFromYesterday(logs, 'child-1', '2026-03-15', allCategories, 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('reintroduced');
    });

    it('skips neutral items (no logs for that category)', () => {
      const logs = [
        createLog({ date: '2026-03-14', categoryId: 'dairy', action: 'eliminated' }),
      ];
      const result = copyFromYesterday(logs, 'child-1', '2026-03-15', allCategories, 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe('dairy');
    });

    it('sets correct childId and createdBy', () => {
      const logs = [createLog({ date: '2026-03-14', action: 'eliminated' })];
      const result = copyFromYesterday(logs, 'child-2', '2026-03-15', allCategories, 'user-2');
      expect(result[0].childId).toBe('child-2');
      expect(result[0].createdBy).toBe('user-2');
    });
  });

  describe('hasLogsForDate', () => {
    it('returns true when logs exist for date', () => {
      const logs = [createLog({ date: '2026-03-15' })];
      expect(hasLogsForDate(logs, '2026-03-15')).toBe(true);
    });

    it('returns false when no logs exist for date', () => {
      const logs = [createLog({ date: '2026-03-14' })];
      expect(hasLogsForDate(logs, '2026-03-15')).toBe(false);
    });

    it('returns false for empty logs', () => {
      expect(hasLogsForDate([], '2026-03-15')).toBe(false);
    });
  });

  describe('getMostRecentLog', () => {
    it('returns undefined when no matching logs', () => {
      const result = getMostRecentLog([], 'dairy', '2026-03-15');
      expect(result).toBeUndefined();
    });

    it('returns the log for exact date and category', () => {
      const log = createLog({ date: '2026-03-15', categoryId: 'dairy' });
      const result = getMostRecentLog([log], 'dairy', '2026-03-15');
      expect(result?.id).toBe(log.id);
    });

    it('returns the most recent log by createdAt', () => {
      const logs = [
        createLog({ date: '2026-03-15', createdAt: '2026-03-15T10:00:00Z', action: 'eliminated' }),
        createLog({ date: '2026-03-15', createdAt: '2026-03-15T11:00:00Z', action: 'reintroduced' }),
      ];
      const result = getMostRecentLog(logs, 'dairy', '2026-03-15');
      expect(result?.action).toBe('reintroduced');
    });
  });

  describe('countActiveReintroductions', () => {
    it('returns 0 for no logs', () => {
      expect(countActiveReintroductions([], '2026-03-15', ['dairy', 'eggs'])).toBe(0);
    });

    it('counts only reintroduced items', () => {
      const logs = [
        createLog({ categoryId: 'dairy', action: 'eliminated' }),
        createLog({ categoryId: 'eggs', action: 'reintroduced' }),
        createLog({ categoryId: 'wheat', action: 'reintroduced' }),
      ];
      expect(countActiveReintroductions(logs, '2026-03-15', ['dairy', 'eggs', 'wheat'])).toBe(2);
    });
  });

  describe('getSubItemFoodStatus', () => {
    it('returns neutral when no matching sub-item logs', () => {
      expect(getSubItemFoodStatus([], 'dairy', 'milk', '2026-03-15')).toBe('neutral');
    });

    it('returns status for matching sub-item', () => {
      const logs = [
        createLog({ categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' }),
        createLog({ categoryId: 'dairy', subItemId: 'cheese', action: 'reintroduced' }),
      ];
      expect(getSubItemFoodStatus(logs, 'dairy', 'milk', '2026-03-15')).toBe('eliminated');
      expect(getSubItemFoodStatus(logs, 'dairy', 'cheese', '2026-03-15')).toBe('reintroduced');
    });

    it('ignores future logs', () => {
      const logs = [
        createLog({ categoryId: 'dairy', subItemId: 'milk', date: '2026-03-16', action: 'reintroduced' }),
      ];
      expect(getSubItemFoodStatus(logs, 'dairy', 'milk', '2026-03-15')).toBe('neutral');
    });
  });

  describe('getDatesInRange', () => {
    it('returns single date for same start and end', () => {
      expect(getDatesInRange('2026-03-15', '2026-03-15')).toEqual(['2026-03-15']);
    });

    it('returns all dates in range', () => {
      expect(getDatesInRange('2026-03-14', '2026-03-16')).toEqual([
        '2026-03-14',
        '2026-03-15',
        '2026-03-16',
      ]);
    });

    it('handles month boundary', () => {
      const dates = getDatesInRange('2026-02-27', '2026-03-02');
      expect(dates).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    });
  });

  describe('buildStatusSets', () => {
    const categories: FoodCategory[] = [
      { id: 'eggs', slug: 'eggs', nameCs: 'Vejce', icon: '🥚', sortOrder: 1, subItems: [] },
      {
        id: 'dairy',
        slug: 'dairy',
        nameCs: 'Mléčné',
        icon: '🥛',
        sortOrder: 0,
        subItems: [
          { id: 'milk', categoryId: 'dairy', slug: 'milk', nameCs: 'Mléko', sortOrder: 0 },
          { id: 'cheese', categoryId: 'dairy', slug: 'cheese', nameCs: 'Sýr', sortOrder: 1 },
        ],
      },
    ];

    it('returns empty sets for no logs', () => {
      const { eliminated, reintroduced } = buildStatusSets([], '2026-03-15', categories);
      expect(eliminated.size).toBe(0);
      expect(reintroduced.size).toBe(0);
    });

    it('builds sets correctly for categories without sub-items', () => {
      const logs = [createLog({ categoryId: 'eggs', action: 'eliminated' })];
      const { eliminated } = buildStatusSets(logs, '2026-03-15', categories);
      expect(eliminated.has('eggs')).toBe(true);
    });

    it('builds sets correctly for sub-items', () => {
      const logs = [
        createLog({ categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' }),
        createLog({ categoryId: 'dairy', subItemId: 'cheese', action: 'reintroduced' }),
      ];
      const { eliminated, reintroduced } = buildStatusSets(logs, '2026-03-15', categories);
      expect(eliminated.has('dairy:milk')).toBe(true);
      expect(reintroduced.has('dairy:cheese')).toBe(true);
    });
  });

  describe('applyDraftToRange', () => {
    it('generates entries for each date and each drafted item', () => {
      const eliminated = new Set(['eggs', 'dairy:milk']);
      const reintroduced = new Set(['dairy:cheese']);
      const dates = ['2026-03-14', '2026-03-15'];

      const entries = applyDraftToRange(eliminated, reintroduced, dates, 'child-1', 'user-1');

      // 2 dates × (2 eliminated + 1 reintroduced) = 6 entries
      expect(entries).toHaveLength(6);
      expect(entries.every((e) => e.childId === 'child-1')).toBe(true);
      expect(entries.filter((e) => e.action === 'eliminated')).toHaveLength(4);
      expect(entries.filter((e) => e.action === 'reintroduced')).toHaveLength(2);
    });

    it('returns empty array for empty drafts', () => {
      const entries = applyDraftToRange(new Set(), new Set(), ['2026-03-15'], 'child-1', 'user-1');
      expect(entries).toHaveLength(0);
    });

    it('parses category:subItem keys correctly', () => {
      const eliminated = new Set(['dairy:milk']);
      const entries = applyDraftToRange(eliminated, new Set(), ['2026-03-15'], 'child-1', 'user-1');
      expect(entries[0].categoryId).toBe('dairy');
      expect(entries[0].subItemId).toBe('milk');
    });

    it('handles category-only keys (no subItemId)', () => {
      const eliminated = new Set(['eggs']);
      const entries = applyDraftToRange(eliminated, new Set(), ['2026-03-15'], 'child-1', 'user-1');
      expect(entries[0].categoryId).toBe('eggs');
      expect(entries[0].subItemId).toBeUndefined();
    });
  });

  describe('applyDraftDiffToRange', () => {
    it('only saves items that changed from snapshot', () => {
      // Snapshot: eggs eliminated, dairy:milk eliminated
      const snapElim = new Set(['eggs', 'dairy:milk']);
      const snapReintro = new Set<string>();
      // Draft: eggs still eliminated (unchanged), dairy:milk still eliminated (unchanged), nuts newly eliminated
      const draftElim = new Set(['eggs', 'dairy:milk', 'nuts']);
      const draftReintro = new Set<string>();

      const entries = applyDraftDiffToRange(
        draftElim, draftReintro, snapElim, snapReintro,
        ['2026-03-15'], 'child-1', 'user-1'
      );

      // Only nuts is new
      expect(entries).toHaveLength(1);
      expect(entries[0].categoryId).toBe('nuts');
      expect(entries[0].action).toBe('eliminated');
    });

    it('returns empty when nothing changed', () => {
      const snapElim = new Set(['eggs']);
      const snapReintro = new Set(['dairy:milk']);
      const entries = applyDraftDiffToRange(
        new Set(['eggs']), new Set(['dairy:milk']), snapElim, snapReintro,
        ['2026-03-15'], 'child-1', 'user-1'
      );
      expect(entries).toHaveLength(0);
    });

    it('generates reintroduced log when item removed from eliminated', () => {
      const snapElim = new Set(['eggs', 'nuts']);
      const snapReintro = new Set<string>();
      // User un-toggled eggs (removed from both sets = back to neutral)
      const draftElim = new Set(['nuts']);
      const draftReintro = new Set<string>();

      const entries = applyDraftDiffToRange(
        draftElim, draftReintro, snapElim, snapReintro,
        ['2026-03-15'], 'child-1', 'user-1'
      );

      // eggs removed from eliminated → reintroduced log to cancel
      expect(entries).toHaveLength(1);
      expect(entries[0].categoryId).toBe('eggs');
      expect(entries[0].action).toBe('reintroduced');
    });

    it('handles new reintroductions correctly', () => {
      const snapElim = new Set(['eggs']);
      const snapReintro = new Set<string>();
      // User moved eggs from eliminated to reintroduced
      const draftElim = new Set<string>();
      const draftReintro = new Set(['eggs']);

      const entries = applyDraftDiffToRange(
        draftElim, draftReintro, snapElim, snapReintro,
        ['2026-03-15'], 'child-1', 'user-1'
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].categoryId).toBe('eggs');
      expect(entries[0].action).toBe('reintroduced');
    });

    it('multiplies diff across date range', () => {
      const snapElim = new Set<string>();
      const snapReintro = new Set<string>();
      const draftElim = new Set(['eggs', 'nuts']);

      const entries = applyDraftDiffToRange(
        draftElim, new Set(), snapElim, snapReintro,
        ['2026-03-14', '2026-03-15', '2026-03-16'], 'child-1', 'user-1'
      );

      // 2 new items × 3 dates = 6 entries
      expect(entries).toHaveLength(6);
    });
  });

  describe('getEliminatedCategories', () => {
    const categories: FoodCategory[] = [
      { id: 'eggs', slug: 'eggs', nameCs: 'Vejce', icon: '🥚', sortOrder: 1, subItems: [] },
      {
        id: 'dairy',
        slug: 'dairy',
        nameCs: 'Mléčné',
        icon: '🥛',
        sortOrder: 0,
        subItems: [
          { id: 'milk', categoryId: 'dairy', slug: 'milk', nameCs: 'Mléko', sortOrder: 0 },
        ],
      },
    ];

    it('returns empty for no logs', () => {
      expect(getEliminatedCategories([], '2026-03-15', categories)).toHaveLength(0);
    });

    it('returns categories with eliminated items', () => {
      const logs = [createLog({ categoryId: 'eggs', action: 'eliminated' })];
      const result = getEliminatedCategories(logs, '2026-03-15', categories);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('eggs');
    });

    it('returns category when sub-item is eliminated', () => {
      const logs = [createLog({ categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' })];
      const result = getEliminatedCategories(logs, '2026-03-15', categories);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dairy');
    });
  });

  describe('getReintroducedCategories', () => {
    const categories: FoodCategory[] = [
      { id: 'eggs', slug: 'eggs', nameCs: 'Vejce', icon: '🥚', sortOrder: 1, subItems: [] },
      { id: 'nuts', slug: 'nuts', nameCs: 'Ořechy', icon: '🥜', sortOrder: 2, subItems: [] },
    ];

    it('returns categories with reintroduced status', () => {
      const logs = [
        createLog({ categoryId: 'eggs', action: 'reintroduced' }),
        createLog({ categoryId: 'nuts', action: 'eliminated' }),
      ];
      const result = getReintroducedCategories(logs, '2026-03-15', categories);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('eggs');
    });

    it('excludes categories that still have eliminations', () => {
      const logs = [createLog({ categoryId: 'eggs', action: 'eliminated' })];
      expect(getReintroducedCategories(logs, '2026-03-15', categories)).toHaveLength(0);
    });
  });
});
