import type { FoodCategory } from '$lib/domain/models';

/**
 * Draft elimination store — manages staged elimination/reintroduction changes
 * in edit mode. Changes are only persisted on explicit save.
 *
 * Keys are in the format "categoryId" or "categoryId:subItemId".
 */

let _draftEliminated = $state<Set<string>>(new Set());
let _draftReintroduced = $state<Set<string>>(new Set());
let _committedElimSnapshot = $state<Set<string>>(new Set());
let _committedReintroSnapshot = $state<Set<string>>(new Set());
let _expandedCategoryId = $state<string | null>(null);

function key(catId: string, subId?: string): string {
  return subId ? `${catId}:${subId}` : catId;
}

export const draftEliminationStore = {
  get draftEliminated() {
    return _draftEliminated;
  },
  get draftReintroduced() {
    return _draftReintroduced;
  },
  get committedElimSnapshot() {
    return _committedElimSnapshot;
  },
  get committedReintroSnapshot() {
    return _committedReintroSnapshot;
  },
  get expandedCategoryId() {
    return _expandedCategoryId;
  },

  key,

  /** Initialize draft from existing Sets (typically built from FoodLog data) */
  initFromSets(eliminated: Set<string>, reintroduced: Set<string>) {
    _draftEliminated = new Set(eliminated);
    _draftReintroduced = new Set(reintroduced);
    _committedElimSnapshot = new Set(eliminated);
    _committedReintroSnapshot = new Set(reintroduced);
    _expandedCategoryId = null;
  },

  clear() {
    _draftEliminated = new Set();
    _draftReintroduced = new Set();
    _committedElimSnapshot = new Set();
    _committedReintroSnapshot = new Set();
    _expandedCategoryId = null;
  },

  toggleExpand(catId: string) {
    _expandedCategoryId = _expandedCategoryId === catId ? null : catId;
  },

  // ── Individual toggles ─────────────────────────────────────

  toggleElim(catId: string, subId?: string) {
    const k = key(catId, subId);
    const nE = new Set(_draftEliminated);
    const nR = new Set(_draftReintroduced);
    if (nE.has(k)) {
      nE.delete(k);
    } else {
      nE.add(k);
      nR.delete(k);
    }
    _draftEliminated = nE;
    _draftReintroduced = nR;
  },

  toggleReintro(catId: string, subId?: string) {
    const k = key(catId, subId);
    const nR = new Set(_draftReintroduced);
    const nE = new Set(_draftEliminated);
    if (nR.has(k)) {
      nR.delete(k);
    } else {
      nR.add(k);
      nE.delete(k);
    }
    _draftReintroduced = nR;
    _draftEliminated = nE;
  },

  // ── Group toggles (category-level) ────────────────────────

  toggleGroupElim(cat: FoodCategory) {
    if (cat.subItems.length === 0) {
      this.toggleElim(cat.id);
      return;
    }
    const allOn = cat.subItems.every((si) => _draftEliminated.has(key(cat.id, si.id)));
    const nE = new Set(_draftEliminated);
    const nR = new Set(_draftReintroduced);
    for (const si of cat.subItems) {
      const k = key(cat.id, si.id);
      if (allOn) {
        nE.delete(k);
      } else {
        nE.add(k);
        nR.delete(k);
      }
    }
    _draftEliminated = nE;
    _draftReintroduced = nR;
  },

  toggleGroupReintro(cat: FoodCategory) {
    if (cat.subItems.length === 0) {
      this.toggleReintro(cat.id);
      return;
    }
    const allOn = cat.subItems.every((si) => _draftReintroduced.has(key(cat.id, si.id)));
    const nR = new Set(_draftReintroduced);
    const nE = new Set(_draftEliminated);
    for (const si of cat.subItems) {
      const k = key(cat.id, si.id);
      if (allOn) {
        nR.delete(k);
      } else {
        nR.add(k);
        nE.delete(k);
      }
    }
    _draftReintroduced = nR;
    _draftEliminated = nE;
  },

  // ── Query helpers ─────────────────────────────────────────

  isElim(catId: string, subId?: string): boolean {
    return _draftEliminated.has(key(catId, subId));
  },

  isReintro(catId: string, subId?: string): boolean {
    return _draftReintroduced.has(key(catId, subId));
  },

  catFullElim(cat: FoodCategory): boolean {
    if (cat.subItems.length === 0) return _draftEliminated.has(key(cat.id));
    return cat.subItems.every((si) => _draftEliminated.has(key(cat.id, si.id)));
  },

  catPartialElim(cat: FoodCategory): boolean {
    if (cat.subItems.length === 0) return _draftEliminated.has(key(cat.id));
    return cat.subItems.some((si) => _draftEliminated.has(key(cat.id, si.id)));
  },

  catFullReintro(cat: FoodCategory): boolean {
    if (cat.subItems.length === 0) return _draftReintroduced.has(key(cat.id));
    return cat.subItems.every((si) => _draftReintroduced.has(key(cat.id, si.id)));
  },

  catPartialReintro(cat: FoodCategory): boolean {
    if (cat.subItems.length === 0) return _draftReintroduced.has(key(cat.id));
    return cat.subItems.some((si) => _draftReintroduced.has(key(cat.id, si.id)));
  },

  /** Check if a category is relevant for reintroduce mode (was eliminated or reintroduced in snapshot) */
  snapshotCatRelevantForReintro(cat: FoodCategory): boolean {
    if (cat.subItems.length === 0) {
      return (
        _committedElimSnapshot.has(key(cat.id)) ||
        _committedReintroSnapshot.has(key(cat.id))
      );
    }
    return cat.subItems.some(
      (si) =>
        _committedElimSnapshot.has(key(cat.id, si.id)) ||
        _committedReintroSnapshot.has(key(cat.id, si.id))
    );
  },

  /** Check if a sub-item is relevant for reintroduce mode */
  snapshotSubRelevantForReintro(catId: string, subId: string): boolean {
    return (
      _committedElimSnapshot.has(key(catId, subId)) ||
      _committedReintroSnapshot.has(key(catId, subId))
    );
  },
};
