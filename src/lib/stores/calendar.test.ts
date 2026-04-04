import { describe, it, expect, beforeEach } from 'vitest';
import { calendarStore } from './calendar.svelte';

beforeEach(() => {
  calendarStore.cancelEdit(); // reset to view mode
  calendarStore.setInspectedDate(null);
});

describe('calendarStore', () => {
  describe('navigateMonth', () => {
    it('advances month by delta', () => {
      const startYear = calendarStore.year;
      const startMonth = calendarStore.month;
      calendarStore.navigateMonth(1);
      if (startMonth === 11) {
        expect(calendarStore.month).toBe(0);
        expect(calendarStore.year).toBe(startYear + 1);
      } else {
        expect(calendarStore.month).toBe(startMonth + 1);
      }
    });

    it('goes back across year boundary', () => {
      calendarStore.goToDate('2026-01-15');
      calendarStore.navigateMonth(-1);
      expect(calendarStore.year).toBe(2025);
      expect(calendarStore.month).toBe(11);
    });
  });

  describe('goToDate', () => {
    it('sets year and month from ISO date string', () => {
      calendarStore.goToDate('2025-06-15');
      expect(calendarStore.year).toBe(2025);
      expect(calendarStore.month).toBe(5); // 0-indexed
    });
  });

  describe('handleDayClick in view mode', () => {
    it('sets inspected date on first click', () => {
      calendarStore.handleDayClick('2026-03-10');
      expect(calendarStore.inspectedDate).toBe('2026-03-10');
    });

    it('toggles off when clicking same date', () => {
      calendarStore.handleDayClick('2026-03-10');
      calendarStore.handleDayClick('2026-03-10');
      expect(calendarStore.inspectedDate).toBeNull();
    });

    it('switches to new date when clicking different date', () => {
      calendarStore.handleDayClick('2026-03-10');
      calendarStore.handleDayClick('2026-03-12');
      expect(calendarStore.inspectedDate).toBe('2026-03-12');
    });
  });

  describe('enterEditMode', () => {
    it('enters edit mode with inspected date as range start', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      expect(calendarStore.mode).toBe('edit');
      expect(calendarStore.rangeStart).toBe('2026-03-10');
      expect(calendarStore.rangeEnd).toBeNull();
      expect(calendarStore.inspectedDate).toBeNull();
      expect(calendarStore.actionMode).toBe('eliminate');
    });

    it('uses today when no inspected date', () => {
      calendarStore.setInspectedDate(null);
      calendarStore.enterEditMode();
      expect(calendarStore.mode).toBe('edit');
      expect(calendarStore.rangeStart).toBeTruthy();
    });
  });

  describe('handleDayClick in edit mode', () => {
    beforeEach(() => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      // rangeStart is now '2026-03-10', rangeEnd is null
    });

    it('sets range end on second click', () => {
      calendarStore.handleDayClick('2026-03-15');
      expect(calendarStore.rangeEnd).toBe('2026-03-15');
    });

    it('resets range on third click', () => {
      calendarStore.handleDayClick('2026-03-15'); // set end
      calendarStore.handleDayClick('2026-03-20'); // reset
      expect(calendarStore.rangeStart).toBe('2026-03-20');
      expect(calendarStore.rangeEnd).toBeNull();
    });
  });

  describe('cancelEdit', () => {
    it('returns to view mode and clears range', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-15');
      calendarStore.cancelEdit();
      expect(calendarStore.mode).toBe('view');
      expect(calendarStore.rangeStart).toBeNull();
      expect(calendarStore.rangeEnd).toBeNull();
      expect(calendarStore.actionMode).toBe('eliminate');
    });
  });

  describe('exitEditMode', () => {
    it('returns to view mode and sets focus date', () => {
      calendarStore.enterEditMode();
      calendarStore.exitEditMode('2026-03-12');
      expect(calendarStore.mode).toBe('view');
      expect(calendarStore.inspectedDate).toBe('2026-03-12');
      expect(calendarStore.rangeStart).toBeNull();
    });
  });

  describe('getSortedRange', () => {
    it('returns null when no range start', () => {
      expect(calendarStore.getSortedRange()).toBeNull();
    });

    it('returns single-day range when only start is set', () => {
      calendarStore.enterEditMode();
      // rangeStart set, rangeEnd null
      const sorted = calendarStore.getSortedRange();
      expect(sorted).toBeTruthy();
      expect(sorted!.start).toBe(sorted!.end);
    });

    it('sorts reversed date range correctly', () => {
      calendarStore.setInspectedDate('2026-03-20');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-10'); // end before start
      const sorted = calendarStore.getSortedRange();
      expect(sorted!.start).toBe('2026-03-10');
      expect(sorted!.end).toBe('2026-03-20');
    });

    it('preserves already-sorted range', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-20');
      const sorted = calendarStore.getSortedRange();
      expect(sorted!.start).toBe('2026-03-10');
      expect(sorted!.end).toBe('2026-03-20');
    });
  });

  describe('isInRange', () => {
    it('returns false when no range', () => {
      expect(calendarStore.isInRange('2026-03-15')).toBe(false);
    });

    it('returns true for dates within range', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-20');
      expect(calendarStore.isInRange('2026-03-15')).toBe(true);
    });

    it('includes range boundaries', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-20');
      expect(calendarStore.isInRange('2026-03-10')).toBe(true);
      expect(calendarStore.isInRange('2026-03-20')).toBe(true);
    });

    it('returns false for dates outside range', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-20');
      expect(calendarStore.isInRange('2026-03-09')).toBe(false);
      expect(calendarStore.isInRange('2026-03-21')).toBe(false);
    });
  });

  describe('isRangeEndpoint', () => {
    it('identifies start and end dates as endpoints', () => {
      calendarStore.setInspectedDate('2026-03-10');
      calendarStore.enterEditMode();
      calendarStore.handleDayClick('2026-03-20');
      expect(calendarStore.isRangeEndpoint('2026-03-10')).toBe(true);
      expect(calendarStore.isRangeEndpoint('2026-03-20')).toBe(true);
      expect(calendarStore.isRangeEndpoint('2026-03-15')).toBe(false);
    });
  });

  describe('setActionMode', () => {
    it('switches between eliminate and reintroduce', () => {
      expect(calendarStore.actionMode).toBe('eliminate');
      calendarStore.setActionMode('reintroduce');
      expect(calendarStore.actionMode).toBe('reintroduce');
      calendarStore.setActionMode('eliminate');
      expect(calendarStore.actionMode).toBe('eliminate');
    });
  });
});
