import { createMealSession } from '$lib/stores/meal-session';
import {
	emptyWorkingMeal,
	fromMealItems,
	allConfirmedFoods,
	toMealItems,
} from '$lib/domain/working-meal';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';
import type { DiscardKind } from '$lib/stores/discard-buffer';

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

export type MealEditor = {
	readonly workingMeal: WorkingMeal;
	readonly confirmedFoods: ReturnType<typeof allConfirmedFoods>;
	readonly editingExisting: boolean;
	/** Persisted `createdAt` for the loaded slot; `null` on compose-new. */
	readonly loadedCreatedAt: string | null;
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

	async function open(next: MealSlot): Promise<void> {
		slot = next;
		const session = createMealSession(next.date);
		const result = await session.loadBySlot(next.date, next.mealType);
		if (result.ok && result.data) {
			workingMeal = fromMealItems(result.data.items, result.data.notes ?? '');
			editingExisting = true;
			loadedCreatedAt = result.data.createdAt;
		} else {
			workingMeal = emptyWorkingMeal();
			editingExisting = false;
			loadedCreatedAt = null;
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
		if (state.kind === 'edit') {
			// The persisted row is still in Dexie — re-fetch its `createdAt` so
			// finalize preserves it across the back-out → undo → save round-trip.
			editingExisting = true;
			const session = createMealSession(state.slot.date);
			const res = await session.loadBySlot(state.slot.date, state.slot.mealType);
			loadedCreatedAt = res.ok && res.data ? res.data.createdAt : null;
		} else {
			// `delete` (row is gone) and `compose` (was empty) both finalize as
			// fresh compose-new on next save.
			editingExisting = false;
			loadedCreatedAt = null;
		}
	}

	async function finalize(opts: FinalizeOptions = {}): Promise<Result<void, string>> {
		if (!slot) return { ok: false, error: 'finalize: open(slot) was never called' };
		const items = toMealItems(workingMeal);
		if (items.length === 0) return { ok: true, data: undefined };

		const now = new Date().toISOString();
		const trimmedNotes = opts.notes?.trim();
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
		open,
		update,
		restore,
		finalize,
	};
}
