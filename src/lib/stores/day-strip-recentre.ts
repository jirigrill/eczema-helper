import { writable } from 'svelte/store';

/**
 * Signal store for "the user asked to jump the day strip back to today".
 *
 * Why a counter, not a boolean: when the bottom-nav "Dnes" tab is clicked
 * while the user is already on /day/today, the route param does not change
 * and SvelteKit performs no navigation. The page-level $effect that anchors
 * the strip on selection changes therefore does not re-run. The layout
 * increments this counter, the /day/[date] page subscribes, and any change
 * (even to the same numeric value via re-emit) triggers a strip recentre.
 *
 * Counter, not boolean, so two consecutive clicks both fire — a boolean
 * toggle would alternate true/false but only fire on transitions to the
 * same edge once.
 */
export const dayStripRecentreSignal = writable(0);

export function pulseRecentreDayStrip(): void {
  dayStripRecentreSignal.update((n) => n + 1);
}
