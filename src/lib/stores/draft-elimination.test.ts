import { describe, it, expect, beforeEach } from 'vitest';
import { draftEliminationStore } from './draft-elimination.svelte';
import type { FoodCategory } from '$lib/domain/models';

const dairyCat: FoodCategory = {
  id: 'dairy',
  slug: 'dairy',
  nameCs: 'Mléčné',
  icon: '🥛',
  sortOrder: 0,
  subItems: [
    { id: 'milk', categoryId: 'dairy', slug: 'milk', nameCs: 'Mléko', sortOrder: 0 },
    { id: 'cheese', categoryId: 'dairy', slug: 'cheese', nameCs: 'Sýr', sortOrder: 1 },
  ],
};

const eggsCat: FoodCategory = {
  id: 'eggs',
  slug: 'eggs',
  nameCs: 'Vejce',
  icon: '🥚',
  sortOrder: 1,
  subItems: [],
};

describe('draftEliminationStore', () => {
  beforeEach(() => {
    draftEliminationStore.clear();
  });

  describe('initFromSets', () => {
    it('initializes draft from Sets', () => {
      draftEliminationStore.initFromSets(new Set(['eggs']), new Set(['dairy:milk']));
      expect(draftEliminationStore.isElim('eggs')).toBe(true);
      expect(draftEliminationStore.isReintro('dairy', 'milk')).toBe(true);
    });
  });

  describe('toggle elimination', () => {
    it('toggles item on', () => {
      draftEliminationStore.toggleElim('eggs');
      expect(draftEliminationStore.isElim('eggs')).toBe(true);
    });

    it('toggles item off', () => {
      draftEliminationStore.toggleElim('eggs');
      draftEliminationStore.toggleElim('eggs');
      expect(draftEliminationStore.isElim('eggs')).toBe(false);
    });

    it('eliminates item removes it from reintroduced', () => {
      draftEliminationStore.toggleReintro('eggs');
      expect(draftEliminationStore.isReintro('eggs')).toBe(true);
      draftEliminationStore.toggleElim('eggs');
      expect(draftEliminationStore.isElim('eggs')).toBe(true);
      expect(draftEliminationStore.isReintro('eggs')).toBe(false);
    });
  });

  describe('toggle reintroduction', () => {
    it('reintroducing item removes it from eliminated', () => {
      draftEliminationStore.toggleElim('eggs');
      draftEliminationStore.toggleReintro('eggs');
      expect(draftEliminationStore.isReintro('eggs')).toBe(true);
      expect(draftEliminationStore.isElim('eggs')).toBe(false);
    });
  });

  describe('group toggles', () => {
    it('toggleGroupElim eliminates all sub-items', () => {
      draftEliminationStore.toggleGroupElim(dairyCat);
      expect(draftEliminationStore.isElim('dairy', 'milk')).toBe(true);
      expect(draftEliminationStore.isElim('dairy', 'cheese')).toBe(true);
    });

    it('toggleGroupElim un-eliminates all when all are on', () => {
      draftEliminationStore.toggleGroupElim(dairyCat); // all on
      draftEliminationStore.toggleGroupElim(dairyCat); // all off
      expect(draftEliminationStore.isElim('dairy', 'milk')).toBe(false);
      expect(draftEliminationStore.isElim('dairy', 'cheese')).toBe(false);
    });

    it('toggleGroupElim for category without sub-items toggles the category', () => {
      draftEliminationStore.toggleGroupElim(eggsCat);
      expect(draftEliminationStore.isElim('eggs')).toBe(true);
    });

    it('toggleGroupReintro reintroduces all sub-items', () => {
      draftEliminationStore.toggleGroupReintro(dairyCat);
      expect(draftEliminationStore.isReintro('dairy', 'milk')).toBe(true);
      expect(draftEliminationStore.isReintro('dairy', 'cheese')).toBe(true);
    });
  });

  describe('category query helpers', () => {
    it('catFullElim returns true when all sub-items eliminated', () => {
      draftEliminationStore.toggleGroupElim(dairyCat);
      expect(draftEliminationStore.catFullElim(dairyCat)).toBe(true);
    });

    it('catPartialElim returns true when some sub-items eliminated', () => {
      draftEliminationStore.toggleElim('dairy', 'milk');
      expect(draftEliminationStore.catPartialElim(dairyCat)).toBe(true);
      expect(draftEliminationStore.catFullElim(dairyCat)).toBe(false);
    });

    it('catFullReintro returns true when all sub-items reintroduced', () => {
      draftEliminationStore.toggleGroupReintro(dairyCat);
      expect(draftEliminationStore.catFullReintro(dairyCat)).toBe(true);
    });
  });

  describe('snapshot relevance for reintroduce mode', () => {
    it('returns true for categories that were eliminated in snapshot', () => {
      draftEliminationStore.initFromSets(new Set(['dairy:milk']), new Set());
      expect(draftEliminationStore.snapshotCatRelevantForReintro(dairyCat)).toBe(true);
    });

    it('returns false for categories not in snapshot', () => {
      draftEliminationStore.initFromSets(new Set(), new Set());
      expect(draftEliminationStore.snapshotCatRelevantForReintro(dairyCat)).toBe(false);
    });

    it('returns true for categories that were reintroduced in snapshot', () => {
      draftEliminationStore.initFromSets(new Set(), new Set(['dairy:cheese']));
      expect(draftEliminationStore.snapshotCatRelevantForReintro(dairyCat)).toBe(true);
    });

    it('snapshotSubRelevantForReintro checks specific sub-item', () => {
      draftEliminationStore.initFromSets(new Set(['dairy:milk']), new Set());
      expect(draftEliminationStore.snapshotSubRelevantForReintro('dairy', 'milk')).toBe(true);
      expect(draftEliminationStore.snapshotSubRelevantForReintro('dairy', 'cheese')).toBe(false);
    });
  });

  describe('clear', () => {
    it('resets all state', () => {
      draftEliminationStore.initFromSets(new Set(['eggs']), new Set(['dairy:milk']));
      draftEliminationStore.clear();
      expect(draftEliminationStore.isElim('eggs')).toBe(false);
      expect(draftEliminationStore.isReintro('dairy', 'milk')).toBe(false);
      expect(draftEliminationStore.expandedCategoryId).toBeNull();
    });
  });

  describe('key', () => {
    it('generates key without subId', () => {
      expect(draftEliminationStore.key('eggs')).toBe('eggs');
    });

    it('generates key with subId', () => {
      expect(draftEliminationStore.key('dairy', 'milk')).toBe('dairy:milk');
    });
  });
});
