import { createMealSession } from '$lib/stores/meal-session';
import {
	emptyWorkingMeal,
	fromMealItems,
	allConfirmedFoods,
	toMealItems,
	isNonEmpty,
} from '$lib/domain/working-meal';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { Meal, MealType, MealItem } from '$lib/domain/models';
import type { Result } from '$lib/types/result';
import type { DiscardKind } from '$lib/stores/discard-buffer';

type ComparableItem = {
	name: string;
	foodId: string;
	amount: string;
	preparationMethod?: string;
};
type MealSnapshot = { items: ComparableItem[]; notes: string };

/**
 * Project a working meal + notes into a stable shape suitable for deep-equality.
 * Strips ephemeral state (UUIDs minted on each `toMealItems` call) and trims
 * notes so leading/trailing whitespace is not "dirty".
 */
function snapshotOf(meal: WorkingMeal, notes: string): MealSnapshot {
	const items: ComparableItem[] = toMealItems(meal).map((i: MealItem) => ({
		name: i.name,
		foodId: i.foodId,
		amount: i.amount,
		preparationMethod: i.preparationMethod,
	}));
	return { items, notes: notes.trim() };
}

function snapshotsEqual(a: MealSnapshot, b: MealSnapshot): boolean {
	if (a.notes !== b.notes) return false;
	if (a.items.length !== b.items.length) return false;
	// Order-independent: editing reorders foods; same set of foodIds with
	// same amounts/preparations is "clean" regardless of order.
	const key = (i: ComparableItem) =>
		`${i.foodId}${i.name}${i.amount}${i.preparationMethod ?? ''}`;
	const av = a.items.map(key).sort();
	const bv = b.items.map(key).sort();
	return av.every((k, idx) => k === bv[idx]);
}

/**
 * MealEditor (PRD #284, slice #285) — owns the meal editing lifecycle from
 * `open` to `finalize`. The route delegates load/save here; dirtiness, discard
 * descriptor, undo, and conflict surface land in later slices.
 *
 * Mirrors the shape of `day-view.svelte.ts` (`createDayView`), extended from
 * read-only projection to read-write editing. Persistence reaches Dexie via
 * an internally-created `createMealSession(date)`; no port is injected.
 *
 * Notes-on-meal (#277) live inside `WorkingMeal.notes` — the editor never
 * touches notes directly; `finalize({notes})` writes whatever the route
 * threads through, so the route can keep `mealNotes` as its own bindable.
 */
export type MealSlot = { date: string; mealType: MealType };

export type FinalizeOptions = {
	/**
	 * The notes string to persist on the resulting `Meal`. Trimmed; an empty
	 * string is normalized to `undefined` so the Dexie row reads "no notes".
	 */
	notes?: string;
};

export type FinalizeKind = 'compose' | 'edit';

export type MealEditor = {
	readonly workingMeal: WorkingMeal;
	readonly confirmedFoods: ReturnType<typeof allConfirmedFoods>;
	readonly editingExisting: boolean;
	/** Persisted `createdAt` for the loaded slot; `null` on compose-new. */
	readonly loadedCreatedAt: string | null;
	/**
	 * Live notes text bound to the route's textarea. Dirtiness compares the
	 * trimmed notes against the load snapshot, so whitespace-only padding
	 * does not flip dirty.
	 */
	notes: string;
	/**
	 * True iff the live working meal differs from the load snapshot.
	 * - Compose-new (loaded snapshot is null): dirty iff any food is confirmed/editing.
	 * - Edit: dirty iff foods or trimmed notes differ from the load snapshot
	 *   (order-independent food comparison).
	 */
	readonly dirty: boolean;
	/**
	 * `'edit'` while editing a saved meal, `'compose'` while composing a new
	 * one. Survives load → restore (an undone delete reverts to compose).
	 */
	readonly finalizeKind: FinalizeKind;
	/**
	 * Whether `finalize()` has work to do right now. Edit → dirty; compose →
	 * has any confirmed food. Drives the route's CTA enabledness for the
	 * meal-finalize action (sub-CTAs are gated separately).
	 */
	readonly canFinalize: boolean;
	open(slot: MealSlot): Promise<void>;
	update(fn: (m: WorkingMeal) => WorkingMeal): void;
	/**
	 * Overlay editor state from a discard-buffer undo. The `kind` decides
	 * how `finalize()` will frame the next save:
	 *  - `'edit'`   → re-fetch persisted `createdAt`, treat as edit-update.
	 *  - `'delete'` → the persisted row is gone; treat the next save as a
	 *                 fresh compose-new (mints a new `createdAt`).
	 *  - `'compose'`→ slot was empty before; still compose-new.
	 *
	 * Will be replaced by `applyUndo` once the undo lifecycle moves into
	 * the editor in a later PRD #284 slice.
	 */
	restore(state: { slot: MealSlot; workingMeal: WorkingMeal; kind: DiscardKind }): Promise<void>;
	finalize(opts?: FinalizeOptions): Promise<Result<void, string>>;
};

export function createMealEditor(): MealEditor {
	let workingMeal = $state<WorkingMeal>(emptyWorkingMeal());
	let editingExisting = $state(false);
	let slot = $state<MealSlot | null>(null);
	/** ISO datetime of the loaded meal's `createdAt`; null on compose-new. */
	let loadedCreatedAt = $state<string | null>(null);
	let notes = $state('');
	/**
	 * Snapshot captured on `open` for an existing slot; `null` on compose-new
	 * and after an undone delete (next save mints fresh `createdAt`).
	 */
	let loadSnapshot = $state<MealSnapshot | null>(null);

	const dirty = $derived(
		loadSnapshot === null
			? isNonEmpty(workingMeal)
			: !snapshotsEqual(snapshotOf(workingMeal, notes), loadSnapshot)
	);
	const finalizeKind: FinalizeKind = $derived(editingExisting ? 'edit' : 'compose');
	const canFinalize = $derived(
		editingExisting ? dirty : allConfirmedFoods(workingMeal).length > 0
	);

	async function open(next: MealSlot): Promise<void> {
		slot = next;
		const session = createMealSession(next.date);
		const result = await session.loadBySlot(next.date, next.mealType);
		if (result.ok && result.data) {
			workingMeal = fromMealItems(result.data.items, result.data.notes ?? '');
			editingExisting = true;
			loadedCreatedAt = result.data.createdAt;
			notes = result.data.notes ?? '';
			loadSnapshot = snapshotOf(workingMeal, notes);
		} else {
			workingMeal = emptyWorkingMeal();
			editingExisting = false;
			loadedCreatedAt = null;
			notes = '';
			loadSnapshot = null;
		}
	}

	function update(fn: (m: WorkingMeal) => WorkingMeal): void {
		workingMeal = fn(workingMeal);
	}

	async function restore(state: {
		slot: MealSlot;
		workingMeal: WorkingMeal;
		kind: DiscardKind;
	}): Promise<void> {
		slot = state.slot;
		workingMeal = state.workingMeal;
		notes = state.workingMeal.notes;
		if (state.kind === 'edit') {
			// The persisted row is still in Dexie — re-fetch its `createdAt` so
			// finalize preserves it across the back-out → undo → save round-trip.
			editingExisting = true;
			const session = createMealSession(state.slot.date);
			const res = await session.loadBySlot(state.slot.date, state.slot.mealType);
			loadedCreatedAt = res.ok && res.data ? res.data.createdAt : null;
			// Re-capture the snapshot so the rehydrated state reads as the
			// "loaded" baseline; further edits compare against it.
			loadSnapshot = snapshotOf(workingMeal, notes);
		} else {
			// `delete` (row is gone) and `compose` (was empty) both finalize as
			// fresh compose-new on next save.
			editingExisting = false;
			loadedCreatedAt = null;
			loadSnapshot = null;
		}
	}

	async function finalize(opts: FinalizeOptions = {}): Promise<Result<void, string>> {
		if (!slot) return { ok: false, error: 'finalize: open(slot) was never called' };
		const items = toMealItems(workingMeal);
		if (items.length === 0) return { ok: true, data: undefined };

		const now = new Date().toISOString();
		// Prefer the editor's own `notes` state; opts.notes is honoured for
		// callers that still thread their own bindable (will go away once
		// every caller binds to `editor.notes`).
		const rawNotes = opts.notes ?? notes;
		const trimmedNotes = rawNotes.trim();
		const meal: Meal = {
			id: `${slot.date}:${slot.mealType}`,
			date: slot.date,
			mealType: slot.mealType,
			actor: 'mother',
			items,
			notes: trimmedNotes || undefined,
			createdAt: loadedCreatedAt ?? now,
			...(loadedCreatedAt !== null ? { updatedAt: now } : {}),
		};
		const session = createMealSession(slot.date);
		return session.save(meal);
	}

	return {
		get workingMeal() { return workingMeal; },
		get confirmedFoods() { return allConfirmedFoods(workingMeal); },
		get editingExisting() { return editingExisting; },
		get loadedCreatedAt() { return loadedCreatedAt; },
		get notes() { return notes; },
		set notes(v: string) { notes = v; },
		get dirty() { return dirty; },
		get finalizeKind() { return finalizeKind; },
		get canFinalize() { return canFinalize; },
		open,
		update,
		restore,
		finalize,
	};
}
