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

type ToggleMode = 'elim' | 'reintro';

function _getPrimarySets(mode: ToggleMode): { primary: Set<string>; opposite: Set<string> } {
  return mode === 'elim'
    ? { primary: _draftEliminated, opposite: _draftReintroduced }
    : { primary: _draftReintroduced, opposite: _draftEliminated };
}

function _commitSets(mode: ToggleMode, primary: Set<string>, opposite: Set<string>) {
  if (mode === 'elim') {
    _draftEliminated = primary;
    _draftReintroduced = opposite;
  } else {
    _draftReintroduced = primary;
    _draftEliminated = opposite;
  }
}

function _toggleItem(k: string, mode: ToggleMode) {
  const { primary, opposite } = _getPrimarySets(mode);
  const nP = new Set(primary);
  const nO = new Set(opposite);
  if (nP.has(k)) {
    nP.delete(k);
  } else {
    nP.add(k);
    nO.delete(k);
  }
  _commitSets(mode, nP, nO);
}

function _catMatch(cat: FoodCategory, set: Set<string>, method: 'every' | 'some'): boolean {
  if (cat.subItems.length === 0) return set.has(key(cat.id));
  return cat.subItems[method]((si) => set.has(key(cat.id, si.id)));
}

function _toggleGroup(cat: FoodCategory, mode: ToggleMode) {
  if (cat.subItems.length === 0) {
    _toggleItem(key(cat.id), mode);
    return;
  }
  const { primary, opposite } = _getPrimarySets(mode);
  const allOn = cat.subItems.every((si) => primary.has(key(cat.id, si.id)));
  const nP = new Set(primary);
  const nO = new Set(opposite);
  for (const si of cat.subItems) {
    const k = key(cat.id, si.id);
    if (allOn) {
      nP.delete(k);
    } else {
      nP.add(k);
      nO.delete(k);
    }
  }
  _commitSets(mode, nP, nO);
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
    _toggleItem(key(catId, subId), 'elim');
  },

  toggleReintro(catId: string, subId?: string) {
    _toggleItem(key(catId, subId), 'reintro');
  },

  // ── Group toggles (category-level) ────────────────────────

  toggleGroupElim(cat: FoodCategory) {
    _toggleGroup(cat, 'elim');
  },

  toggleGroupReintro(cat: FoodCategory) {
    _toggleGroup(cat, 'reintro');
  },

  // ── Query helpers ─────────────────────────────────────────

  isElim(catId: string, subId?: string): boolean {
    return _draftEliminated.has(key(catId, subId));
  },

  isReintro(catId: string, subId?: string): boolean {
    return _draftReintroduced.has(key(catId, subId));
  },

  catFullElim(cat: FoodCategory): boolean {
    return _catMatch(cat, _draftEliminated, 'every');
  },

  catPartialElim(cat: FoodCategory): boolean {
    return _catMatch(cat, _draftEliminated, 'some');
  },

  catFullReintro(cat: FoodCategory): boolean {
    return _catMatch(cat, _draftReintroduced, 'every');
  },

  catPartialReintro(cat: FoodCategory): boolean {
    return _catMatch(cat, _draftReintroduced, 'some');
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
