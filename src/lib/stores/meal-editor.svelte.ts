import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { db } from '$lib/db/atopic-db';
import { snapshotOf, snapshotsEqual } from '$lib/domain/meal-dirtiness';
import type { MealSnapshot } from '$lib/domain/meal-dirtiness';
import type { Actor, AllergenId, MealItem, MealType, PortionKind } from '$lib/domain/models';
import { detectConflicts } from '$lib/domain/schedule-queries';
import {
  allConfirmedFoods,
  emptyWorkingMeal,
  finalizeWorkingMeal,
  fromMealItems,
  isNonEmpty,
} from '$lib/domain/working-meal';
import type { WorkingMeal } from '$lib/domain/working-meal';
import type { DiscardedMeal, MealDiscardKind } from '$lib/stores/discard-buffer';
import type { Result } from '$lib/types/result';

/**
 * MealEditor (PRD #284, slice #285) — owns the meal editing lifecycle from
 * `open` to `finalize`. The route delegates load/save here; dirtiness, discard
 * descriptor, undo, and conflict surface land in later slices.
 *
 * Mirrors the shape of `day-view.svelte.ts` (`createDayView`), extended from
 * read-only projection to read-write editing. Persistence reaches Dexie via
 * a `DexieMealRepository` constructed inside `createMealEditor()`; no port
 * is injected.
 *
 * Notes-on-meal (#277) live inside `WorkingMeal.notes` — the editor never
 * touches notes directly; `finalize({notes})` writes whatever the route
 * threads through, so the route can keep `mealNotes` as its own bindable.
 */
export type MealSlot = { date: string; mealType: MealType; actor: Actor };

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
  /**
   * The set of food ids in the working meal (confirmed or editing) that
   * touch an eliminated allergen for today. Computed by calling the shared
   * `detectConflicts` over the editor's own foods using the elimination
   * window injected via `open(slot, eliminatedToday)`.
   *
   * The route builds its view-specific danger flags
   * (`editingFoodIsEliminated`, `familySaveHasEliminated`, per-row danger
   * styling, the warning banner, the red CTA) on top of this set.
   */
  readonly eliminatedFoodIds: Set<string>;
  /** True iff `eliminatedFoodIds` is non-empty. */
  readonly hasConflicts: boolean;
  open(slot: MealSlot, eliminatedToday?: AllergenId[]): Promise<void>;
  /**
   * Update the elimination window after `open`/`applyUndo` (e.g. when the
   * schedule loads asynchronously and the route's `eliminatedToday` flips
   * from `[]` to its real value). Keeps `eliminatedFoodIds` / `hasConflicts`
   * in sync without re-loading the meal.
   */
  setEliminatedToday(eliminatedToday: AllergenId[]): void;
  update(fn: (m: WorkingMeal) => WorkingMeal): void;
  /**
   * Decide what (if anything) the next discard buffer should contain.
   *
   * Without a hint, infers from the editor's own state:
   *  - Compose-new with any confirmed/editing food → `{ kind: 'meal-compose', workingMeal }`.
   *  - Dirty edit                                  → `{ kind: 'meal-edit', workingMeal }`.
   *  - Clean edit / empty compose                  → `null` (nothing to discard).
   *
   * With `'delete'`, returns `{ kind: 'meal-delete', workingMeal }` regardless of
   * dirtiness — delete is an explicit user action the editor cannot infer
   * (the route calls this after `meals.remove()` succeeds, threading
   * the captured working meal into the buffer for undo).
   *
   * The returned `workingMeal` always carries the live `editor.notes` so
   * the buffer rehydrates whatever the user had typed at the moment of
   * discard. The route pairs this descriptor with `mealType`/`returnTo`
   * before calling `writeBuffer(...)` — the route still owns *when*.
   */
  discardDescriptor(intent?: 'delete'): { kind: MealDiscardKind; workingMeal: WorkingMeal } | null;
  /**
   * Overlay editor state from a discard-buffer undo. The buffer's `kind`
   * decides how `finalize()` will frame the next save:
   *  - `'meal-edit'`    → re-fetch the persisted Meal, take the load snapshot from
   *                 it (the *original* clean baseline), then overlay the
   *                 buffer's working meal. The restored edit therefore reads
   *                 as **dirty** — `Uložit změny` is enabled and a second
   *                 back-out re-buffers (issue #299).
   *  - `'meal-delete'` → the persisted row is gone; treat the next save as a
   *                 fresh compose-new (mints a new `createdAt`).
   *  - `'meal-compose'`→ slot was empty before; still compose-new.
   *
   * `eliminatedToday` is the same value the route passes to `open` and
   * repopulates `eliminatedFoodIds` / `hasConflicts` on the undo mount, so
   * the per-food danger styling and red CTA reappear (issue #299).
   *
   * Slot is passed explicitly because the route owns the URL and the page
   * is freshly mounted on undo navigation (the editor has no slot yet).
   */
  applyUndo(slot: MealSlot, buffer: DiscardedMeal, eliminatedToday?: AllergenId[]): Promise<void>;
  finalize(opts?: FinalizeOptions): Promise<Result<void, string>>;
};

export function createMealEditor(): MealEditor {
  const catalog = new BundledCatalogAdapter();
  const meals = new DexieMealRepository(db, new DexieScheduleRepository(db));
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
  /**
   * Today's elimination window injected by the route; defaults to empty so
   * an editor opened without a window simply reports no conflicts.
   */
  let eliminatedToday = $state<AllergenId[]>([]);

  const dirty = $derived(
    loadSnapshot === null
      ? isNonEmpty(workingMeal)
      : !snapshotsEqual(snapshotOf(workingMeal, notes), loadSnapshot),
  );
  const finalizeKind: FinalizeKind = $derived(editingExisting ? 'edit' : 'compose');
  const canFinalize = $derived(editingExisting ? dirty : allConfirmedFoods(workingMeal).length > 0);
  /**
   * All working-list foods that touch an eliminated allergen — computed via
   * the shared `detectConflicts`, so swapping that function later requires
   * no change here beyond the call site itself. Includes both `confirmed`
   * and `editing` foods so the route can flag a row before the user
   * confirms it (per-row danger styling).
   */
  const eliminatedFoodIds = $derived.by(() => {
    if (eliminatedToday.length === 0) return new Set<string>();
    const activeFoods = workingMeal.families.flatMap((fam) =>
      fam.foods.filter((f) => f.state.status === 'confirmed' || f.state.status === 'editing'),
    );
    const items: MealItem[] = activeFoods.map((f) => ({
      id: f.foodId,
      name: f.name,
      foodId: f.foodId as MealItem['foodId'],
      amount: 'portion' as PortionKind,
    }));
    return new Set(detectConflicts(items, eliminatedToday, catalog).map((c) => c.foodId as string));
  });
  const hasConflicts = $derived(eliminatedFoodIds.size > 0);

  async function open(next: MealSlot, eliminatedTodayArg: AllergenId[] = []): Promise<void> {
    slot = next;
    eliminatedToday = eliminatedTodayArg;
    const result = await meals.loadBySlot(next.date, next.mealType, next.actor);
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

  function setEliminatedToday(next: AllergenId[]): void {
    eliminatedToday = next;
  }

  function discardDescriptor(
    intent?: 'delete',
  ): { kind: MealDiscardKind; workingMeal: WorkingMeal } | null {
    // Snapshot the live `notes` into the working meal so the buffer
    // rehydrates whatever the user had typed at the moment of discard.
    const snapshot: WorkingMeal = { ...workingMeal, notes };
    if (intent === 'delete') {
      return { kind: 'meal-delete', workingMeal: snapshot };
    }
    if (editingExisting) {
      return dirty ? { kind: 'meal-edit', workingMeal: snapshot } : null;
    }
    return isNonEmpty(workingMeal) ? { kind: 'meal-compose', workingMeal: snapshot } : null;
  }

  async function applyUndo(
    next: MealSlot,
    buffer: DiscardedMeal,
    eliminatedTodayArg: AllergenId[] = [],
  ): Promise<void> {
    slot = next;
    eliminatedToday = eliminatedTodayArg;
    workingMeal = buffer.workingMeal;
    notes = buffer.workingMeal.notes;
    if (buffer.kind === 'meal-edit') {
      // The persisted row is still in Dexie — re-fetch it and use IT as the
      // load snapshot, so the buffer's (dirty) working meal compares
      // against the *original* clean baseline. Without this, the editor
      // would treat the restored dirty edit as the new clean baseline,
      // disabling save and silently dropping the food on the next back-out
      // (issue #299).
      editingExisting = true;
      const res = await meals.loadBySlot(next.date, next.mealType, next.actor);
      if (res.ok && res.data) {
        loadedCreatedAt = res.data.createdAt;
        const persistedMeal = fromMealItems(res.data.items, res.data.notes ?? '');
        loadSnapshot = snapshotOf(persistedMeal, res.data.notes ?? '');
      } else {
        loadedCreatedAt = null;
        loadSnapshot = null;
      }
    } else {
      // `meal-delete` (row is gone) and `meal-compose` (was empty) both finalize as
      // fresh compose-new on next save.
      editingExisting = false;
      loadedCreatedAt = null;
      loadSnapshot = null;
    }
  }

  async function finalize(opts: FinalizeOptions = {}): Promise<Result<void, string>> {
    if (!slot) return { ok: false, error: 'finalize: open(slot) was never called' };
    // Prefer the editor's own `notes` state; opts.notes is honoured for
    // callers that still thread their own bindable (will go away once
    // every caller binds to `editor.notes`).
    const meal = finalizeWorkingMeal(slot, workingMeal, opts.notes ?? notes, loadedCreatedAt);
    if (meal === null) return { ok: true, data: undefined };
    return meals.save(meal);
  }

  return {
    get workingMeal() {
      return workingMeal;
    },
    get confirmedFoods() {
      return allConfirmedFoods(workingMeal);
    },
    get editingExisting() {
      return editingExisting;
    },
    get loadedCreatedAt() {
      return loadedCreatedAt;
    },
    get notes() {
      return notes;
    },
    set notes(v: string) {
      notes = v;
    },
    get dirty() {
      return dirty;
    },
    get finalizeKind() {
      return finalizeKind;
    },
    get canFinalize() {
      return canFinalize;
    },
    get eliminatedFoodIds() {
      return eliminatedFoodIds;
    },
    get hasConflicts() {
      return hasConflicts;
    },
    open,
    update,
    setEliminatedToday,
    discardDescriptor,
    applyUndo,
    finalize,
  };
}
