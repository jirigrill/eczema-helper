import { describe, it, expect, beforeEach } from 'vitest';
import { foodLogStore } from './food-log.svelte';
import type { FoodLog } from '../domain/models';

const mockLog: FoodLog = {
  id: 'log-uuid',
  childId: 'child-uuid',
  date: '2025-04-01',
  categoryId: 'dairy',
  action: 'eliminated',
  createdBy: 'user-uuid',
  createdAt: '2025-04-01T10:00:00Z',
  updatedAt: '2025-04-01T10:00:00Z',
};

const mockLog2: FoodLog = {
  id: 'log-uuid-2',
  childId: 'child-uuid',
  date: '2025-04-02',
  categoryId: 'eggs',
  action: 'reintroduced',
  createdBy: 'user-uuid',
  createdAt: '2025-04-02T10:00:00Z',
  updatedAt: '2025-04-02T10:00:00Z',
};

describe('food log store', () => {
  beforeEach(() => {
    foodLogStore.setLogs([]);
    foodLogStore.setSelectedDate(new Date().toISOString().slice(0, 10));
  });

  describe('logs', () => {
    it('starts as empty array', () => {
      expect(foodLogStore.logs).toHaveLength(0);
    });

    it('can be set to an array of logs', () => {
      foodLogStore.setLogs([mockLog, mockLog2]);
      expect(foodLogStore.logs).toHaveLength(2);
      expect(foodLogStore.logs[0].categoryId).toBe('dairy');
    });

    it('can be reset to empty array', () => {
      foodLogStore.setLogs([mockLog]);
      foodLogStore.setLogs([]);
      expect(foodLogStore.logs).toHaveLength(0);
    });
  });

  describe('selectedDate', () => {
    it('defaults to today in YYYY-MM-DD format', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(foodLogStore.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(foodLogStore.selectedDate).toBe(today);
    });

    it('can be set to a specific date', () => {
      foodLogStore.setSelectedDate('2025-03-15');
      expect(foodLogStore.selectedDate).toBe('2025-03-15');
    });
  });
});
