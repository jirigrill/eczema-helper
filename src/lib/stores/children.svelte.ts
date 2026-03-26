import type { Child } from '$lib/domain/models';

const STORAGE_KEY = 'activeChildId';

function loadActiveChildId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function saveActiveChildId(id: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

let _children = $state<Child[]>([]);
let _activeChildId = $state<string | null>(loadActiveChildId());

export const childrenStore = {
  get children() { return _children; },
  get activeChildId() { return _activeChildId; },
  get activeChild() { return _children.find(c => c.id === _activeChildId) ?? _children[0] ?? null; },
  setChildren(children: Child[]) { _children = children; },
  setActiveChildId(id: string | null) {
    _activeChildId = id;
    saveActiveChildId(id);
  }
};
