import type { Child } from '$lib/domain/models';

let _children = $state<Child[]>([]);
let _activeChildId = $state<string | null>(null);

export const childrenStore = {
  get children() { return _children; },
  get activeChildId() { return _activeChildId; },
  get activeChild() { return _children.find(c => c.id === _activeChildId) ?? _children[0] ?? null; },
  setChildren(children: Child[]) { _children = children; },
  setActiveChildId(id: string | null) { _activeChildId = id; }
};
