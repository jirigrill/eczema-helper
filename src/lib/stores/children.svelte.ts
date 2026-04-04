import type { Child } from '$lib/domain/models';

const STORAGE_KEY = 'activeChildId';

function loadActiveChildId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveActiveChildId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (SSR, restricted sandbox)
  }
}

// Use a class with $state fields for proper Svelte 5 reactivity
class ChildrenStore {
  children = $state<Child[]>([]);
  activeChildId = $state<string | null>(loadActiveChildId());

  get activeChild() {
    return this.children.find(c => c.id === this.activeChildId) ?? this.children[0] ?? null;
  }

  setChildren(newChildren: Child[]) {
    this.children = newChildren;
  }

  setActiveChildId(id: string | null) {
    this.activeChildId = id;
    saveActiveChildId(id);
  }
}

export const childrenStore = new ChildrenStore();
