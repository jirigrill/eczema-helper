import { describe, it, expect, beforeEach } from 'vitest';
import { childrenStore } from './children.svelte';
import type { Child } from '../domain/models';

const mockChildA: Child = {
  id: 'child-a-uuid',
  name: 'Emma',
  birthDate: '2025-12-01',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockChildB: Child = {
  id: 'child-b-uuid',
  name: 'Oliver',
  birthDate: '2026-01-15',
  createdAt: '2025-02-01T00:00:00Z',
  updatedAt: '2025-02-01T00:00:00Z',
};

describe('children store', () => {
  // Reset state before each test
  beforeEach(() => {
    childrenStore.setChildren([]);
    childrenStore.setActiveChildId(null);
  });

  describe('selectedChild (derived)', () => {
    it('returns first child when no selection', () => {
      childrenStore.setChildren([mockChildA, mockChildB]);
      expect(childrenStore.activeChild).toStrictEqual(mockChildA);
    });

    it('returns the matching child when ID is set', () => {
      childrenStore.setChildren([mockChildA, mockChildB]);
      childrenStore.setActiveChildId(mockChildB.id);
      expect(childrenStore.activeChild).toStrictEqual(mockChildB);
    });

    it('returns null when children array is empty', () => {
      childrenStore.setChildren([]);
      expect(childrenStore.activeChild).toBeNull();
    });

    it('falls back to first child when ID is invalid', () => {
      childrenStore.setChildren([mockChildA, mockChildB]);
      childrenStore.setActiveChildId('nonexistent-id');
      expect(childrenStore.activeChild).toStrictEqual(mockChildA);
    });
  });

  describe('setChildren', () => {
    it('updates the children array', () => {
      childrenStore.setChildren([mockChildA]);
      expect(childrenStore.children).toHaveLength(1);
      expect(childrenStore.children[0].name).toBe('Emma');
    });
  });

  describe('setActiveChildId', () => {
    it('updates the active child ID', () => {
      childrenStore.setActiveChildId(mockChildB.id);
      expect(childrenStore.activeChildId).toBe(mockChildB.id);
    });
  });
});
