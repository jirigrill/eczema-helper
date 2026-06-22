import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';
import { db } from '$lib/db/atopic-db';
import type { ReintroductionEvaluation } from '$lib/domain/models';

/**
 * Display-only store of every persisted reintroduction verdict (ADR-0016).
 * Reactive over the evaluations table — separate from `scheduleContext` so
 * the core projection stays a pure function of `schedule + answers + date`.
 */
export const evaluationsStore = readable<ReintroductionEvaluation[]>([], (set) => {
	const subscription = liveQuery(() => db.evaluations.toArray()).subscribe({
		next: (rows) => { set(rows ?? []); },
		error: () => { set([]); },
	});
	return () => subscription.unsubscribe();
});
