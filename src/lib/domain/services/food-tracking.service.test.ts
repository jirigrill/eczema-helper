import { describe, it, expect } from 'vitest';
import {
  getExactDateFoodStatus,
  getExactDateSubItemStatus,
  dateHasEliminations,
  dateHasReintroductions,
  buildExactDateStatusSets,
  getExactDateEliminatedDetails,
  getExactDateReintroducedDetails,
  getDatesInRange,
  applyDraftToRange,
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

const testCategories: FoodCategory[] = [
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

describe('food-tracking.service', () => {
  describe('getExactDateFoodStatus', () => {
    it('returns neutral when no logs for exact date', () => {
      expect(getExactDateFoodStatus([], 'dairy', '2026-03-15')).toBe('neutral');
    });

    it('does not carry forward from previous dates', () => {
      const logs = [createLog({ date: '2026-03-14', categoryId: 'dairy', action: 'eliminated' })];
      expect(getExactDateFoodStatus(logs, 'dairy', '2026-03-15')).toBe('neutral');
      expect(getExactDateFoodStatus(logs, 'dairy', '2026-03-14')).toBe('eliminated');
    });

    it('returns most recent action for same date', () => {
      const logs = [
        createLog({ date: '2026-03-15', action: 'eliminated', createdAt: '2026-03-15T10:00:00Z' }),
        createLog({ date: '2026-03-15', action: 'reintroduced', createdAt: '2026-03-15T11:00:00Z' }),
      ];
      expect(getExactDateFoodStatus(logs, 'dairy', '2026-03-15')).toBe('reintroduced');
    });

    it('filters by categoryId', () => {
      const logs = [
        createLog({ categoryId: 'dairy', action: 'eliminated' }),
        createLog({ categoryId: 'eggs', action: 'reintroduced' }),
      ];
      expect(getExactDateFoodStatus(logs, 'dairy', '2026-03-15')).toBe('eliminated');
      expect(getExactDateFoodStatus(logs, 'eggs', '2026-03-15')).toBe('reintroduced');
      expect(getExactDateFoodStatus(logs, 'wheat', '2026-03-15')).toBe('neutral');
    });
  });

  describe('getExactDateSubItemStatus', () => {
    it('does not carry forward from previous dates', () => {
      const logs = [createLog({ date: '2026-03-14', categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' })];
      expect(getExactDateSubItemStatus(logs, 'dairy', 'milk', '2026-03-15')).toBe('neutral');
      expect(getExactDateSubItemStatus(logs, 'dairy', 'milk', '2026-03-14')).toBe('eliminated');
    });

    it('returns status for matching sub-item', () => {
      const logs = [
        createLog({ categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' }),
        createLog({ categoryId: 'dairy', subItemId: 'cheese', action: 'reintroduced' }),
      ];
      expect(getExactDateSubItemStatus(logs, 'dairy', 'milk', '2026-03-15')).toBe('eliminated');
      expect(getExactDateSubItemStatus(logs, 'dairy', 'cheese', '2026-03-15')).toBe('reintroduced');
    });
  });

  describe('dateHasEliminations', () => {
    it('returns false for no logs', () => {
      expect(dateHasEliminations([], '2026-03-15')).toBe(false);
    });

    it('returns true only for exact date with elimination', () => {
      const logs = [
        createLog({ date: '2026-03-14', action: 'eliminated' }),
        createLog({ date: '2026-03-15', action: 'reintroduced' }),
      ];
      expect(dateHasEliminations(logs, '2026-03-14')).toBe(true);
      expect(dateHasEliminations(logs, '2026-03-15')).toBe(false);
      expect(dateHasEliminations(logs, '2026-03-16')).toBe(false);
    });
  });

  describe('dateHasReintroductions', () => {
    it('returns true only for exact date with reintroduction', () => {
      const logs = [createLog({ date: '2026-03-15', action: 'reintroduced' })];
      expect(dateHasReintroductions(logs, '2026-03-15')).toBe(true);
      expect(dateHasReintroductions(logs, '2026-03-14')).toBe(false);
    });
  });

  describe('buildExactDateStatusSets', () => {
    it('returns empty sets for no logs', () => {
      const { eliminated, reintroduced } = buildExactDateStatusSets([], '2026-03-15', testCategories);
      expect(eliminated.size).toBe(0);
      expect(reintroduced.size).toBe(0);
    });

    it('does not include logs from other dates', () => {
      const logs = [createLog({ date: '2026-03-14', categoryId: 'eggs', action: 'eliminated' })];
      const { eliminated } = buildExactDateStatusSets(logs, '2026-03-15', testCategories);
      expect(eliminated.size).toBe(0);
    });

    it('builds sets correctly for sub-items', () => {
      const logs = [
        createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' }),
        createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'cheese', action: 'reintroduced' }),
      ];
      const { eliminated, reintroduced } = buildExactDateStatusSets(logs, '2026-03-15', testCategories);
      expect(eliminated.has('dairy:milk')).toBe(true);
      expect(reintroduced.has('dairy:cheese')).toBe(true);
    });
  });

  describe('getExactDateEliminatedDetails', () => {
    it('returns empty for no logs on that date', () => {
      const logs = [createLog({ date: '2026-03-14', categoryId: 'eggs', action: 'eliminated' })];
      expect(getExactDateEliminatedDetails(logs, '2026-03-15', testCategories)).toHaveLength(0);
    });

    it('returns category with empty items for category without sub-items', () => {
      const logs = [createLog({ date: '2026-03-15', categoryId: 'eggs', action: 'eliminated' })];
      const result = getExactDateEliminatedDetails(logs, '2026-03-15', testCategories);
      expect(result).toHaveLength(1);
      expect(result[0].category.id).toBe('eggs');
      expect(result[0].items).toHaveLength(0);
    });

    it('returns category with specific sub-items that are eliminated', () => {
      const logs = [createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' })];
      const result = getExactDateEliminatedDetails(logs, '2026-03-15', testCategories);
      expect(result).toHaveLength(1);
      expect(result[0].category.id).toBe('dairy');
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].nameCs).toBe('Mléko');
    });

    it('shows only eliminated sub-items, not all', () => {
      const logs = [
        createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'milk', action: 'eliminated' }),
        createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'cheese', action: 'reintroduced' }),
      ];
      const result = getExactDateEliminatedDetails(logs, '2026-03-15', testCategories);
      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].nameCs).toBe('Mléko');
    });
  });

  describe('getExactDateReintroducedDetails', () => {
    it('returns sub-item details for reintroduced items', () => {
      const logs = [createLog({ date: '2026-03-15', categoryId: 'dairy', subItemId: 'milk', action: 'reintroduced' })];
      const result = getExactDateReintroducedDetails(logs, '2026-03-15', testCategories);
      expect(result).toHaveLength(1);
      expect(result[0].category.id).toBe('dairy');
      expect(result[0].items[0].nameCs).toBe('Mléko');
    });
  });

  describe('getDatesInRange', () => {
    it('returns single date for same start and end', () => {
      expect(getDatesInRange('2026-03-15', '2026-03-15')).toEqual(['2026-03-15']);
    });

    it('returns all dates in range', () => {
      expect(getDatesInRange('2026-03-14', '2026-03-16')).toEqual(['2026-03-14', '2026-03-15', '2026-03-16']);
    });

    it('handles month boundary', () => {
      expect(getDatesInRange('2026-02-27', '2026-03-02')).toEqual([
        '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02',
      ]);
    });
  });

  describe('applyDraftToRange', () => {
    it('generates entries for each date and each drafted item', () => {
      const eliminated = new Set(['eggs', 'dairy:milk']);
      const reintroduced = new Set(['dairy:cheese']);
      const entries = applyDraftToRange(eliminated, reintroduced, ['2026-03-14', '2026-03-15'], 'child-1', 'user-1');
      expect(entries).toHaveLength(6); // 2 dates × (2 + 1)
      expect(entries.filter((e) => e.action === 'eliminated')).toHaveLength(4);
      expect(entries.filter((e) => e.action === 'reintroduced')).toHaveLength(2);
    });

    it('returns empty array for empty drafts', () => {
      expect(applyDraftToRange(new Set(), new Set(), ['2026-03-15'], 'child-1', 'user-1')).toHaveLength(0);
    });

    it('parses category:subItem keys correctly', () => {
      const entries = applyDraftToRange(new Set(['dairy:milk']), new Set(), ['2026-03-15'], 'child-1', 'user-1');
      expect(entries[0].categoryId).toBe('dairy');
      expect(entries[0].subItemId).toBe('milk');
    });

    it('handles category-only keys (no subItemId)', () => {
      const entries = applyDraftToRange(new Set(['eggs']), new Set(), ['2026-03-15'], 'child-1', 'user-1');
      expect(entries[0].categoryId).toBe('eggs');
      expect(entries[0].subItemId).toBeUndefined();
    });
  });
});
