import type { AppState } from '$lib/domain/models';

const STATE_KEY = 'v2-prototype-state';

const emptyState = (): AppState => ({
  answers: null,
  schedule: null,
  meals: [],
  assessments: [],
  evaluations: [],
});

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') ?? emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(STATE_KEY);
}

export function notifyStateChange(): void {
  window.dispatchEvent(new CustomEvent('v2-state-change'));
}

export function saveAndNotify(state: AppState): void {
  saveState(state);
  notifyStateChange();
}
