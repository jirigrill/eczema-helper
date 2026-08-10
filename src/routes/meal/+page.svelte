<script lang="ts">
  import { tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type {
    Actor,
    MealSlot,
    MealType,
    PortionKind,
    PreparationMethod,
  } from '$lib/domain/models';
  import { getEligibleActors } from '$lib/domain/models';
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
  import { get } from 'svelte/store';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import { actorConfig } from '$lib/config/actors';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import { familyStrings } from '$lib/strings/families';
  import { preparationsForFood } from '$lib/domain/preparation-rules';
  import { formatDateLongCs, todayIso } from '$lib/utils/date';
  import { computeDayStrip } from '$lib/components/DayStrip/day-strip';
  import { earliestLoggedStore } from '$lib/stores/earliest-logged';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { parseDayQuery } from '$lib/utils/day-query';
  import Toast from '$lib/components/Toast.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
  import DayStrip from '$lib/components/DayStrip/DayStrip.svelte';
  import FabActionSheet from '$lib/components/FabActionSheet.svelte';
  import FamilyGrid from '$lib/components/FamilyGrid.svelte';
  import FamilyDrillIn from '$lib/components/FamilyDrillIn.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';
  import FoodTile from '$lib/components/FoodTile.svelte';

  import { goto, beforeNavigate, pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { mealSession } from '$lib/stores/meal-session';
  import { harvestCandidateSession } from '$lib/stores/harvest-candidate-session';
  import { createMealEditor } from '$lib/stores/meal-editor.svelte';
  import { normalizeKey, mergeCandidate } from '$lib/domain/harvest-candidate';
  import { copyMealInto } from '$lib/domain/working-meal';

  import {
    startEditing,
    confirmFood,
    cancelEditing,
    deselectFood,
    updateEditingAmount,
    updateEditingPreparation,
    commitFamily,
    removeFood,
    editingFood as getEditingFood,
    foodsForFamily,
  } from '$lib/domain/working-meal';
  import type { WorkingMeal } from '$lib/domain/working-meal';
  import { writeBuffer, discardBuffer, clearBuffer } from '$lib/stores/discard-buffer';
  import type { MealDiscardKind, DiscardedMealCopy } from '$lib/stores/discard-buffer';

  // ── Schedule context ──────────────────────────────────────
  const { date: targetDate, returnTo } = $derived(parseDayQuery(page.url));
  const feedingStage = $derived(settingsStore.feedingStage);
  // Who may log at the live feeding stage (spec #564): `breastfed → [mother]`,
  // `mixed → [mother, baby]`, `solids → [baby]`. Drives the actor picker — the
  // pill row shows only when more than one actor is eligible (`mixed`).
  const eligibleActors = $derived<Actor[]>(feedingStage ? getEligibleActors(feedingStage) : []);
  const showActorPicker = $derived(eligibleActors.length > 1);
  // ── Actor selection (issue #569) ─────────────────────────
  // The actor whose meal is being composed. In a single-actor stage it stays
  // fixed on the implicit actor; in `mixed` the picker pills flip it.
  // Seeded from `?actor=` (issue #584): the day view carries the tapped actor
  // in, so in the `mixed` stage tapping the baby's row lands on the baby's meal
  // rather than always defaulting to the mother. Falls back to `mother` (a
  // breastfed newborn's intake is the mother's) when the param is absent or
  // invalid; the `$effect` further down still snaps it to the stage's implicit
  // actor once the live feeding stage resolves (e.g. an out-of-stage `?actor=`).
  let selectedActor = $state<Actor>(parseDayQuery(page.url).actor ?? 'mother');

  // ── Meal type: Fixed-at-Entry (ADR-0018) ─────────────────
  // The meal type is read once from the URL and never mutated in-screen.
  // The Meal-Type FAB Submenu is the only legal entry point, so a missing
  // or invalid `?type=` is treated as a stale link / hand-typed URL and
  // bounces back to the day overview. There is no longer a 'lunch' fallback.
  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  type MealTypeKind = (typeof mealTypes)[number];
  function isMealType(raw: string | null): raw is MealTypeKind {
    return mealTypes.includes(raw as MealTypeKind);
  }
  const urlType = page.url.searchParams.get('type');
  if (!isMealType(urlType)) {
    const fallback = parseDayQuery(page.url).returnTo || `/day/${todayIso()}`;
    goto(fallback, { replaceState: true });
  }
  const selectedMealType: MealTypeKind = isMealType(urlType) ? urlType : 'lunch';

  // ── Actor selection (issue #569) ─────────────────────────
  // `selectedActor` is declared above. The `date:mealType:actor` slot the
  // editor is opened against. Reactive on `selectedActor` so the picker's
  // `open`/`applyUndo` calls always target the current actor's record.
  const currentSlot = $derived({
    date: targetDate,
    mealType: selectedMealType,
    actor: selectedActor,
  });

  async function selectActor(actor: Actor): Promise<void> {
    if (actor === selectedActor) return;
    // Swap-on-dirty (issue #571): autosave the departing actor's confirmed
    // foods + notes before reloading the target, so flipping between the two
    // lists never loses work. Build the target slot explicitly — `selectedActor`
    // (and the derived `currentSlot`) still point at the departing actor here,
    // and must only flip once the autosave succeeds.
    const target = { date: targetDate, mealType: selectedMealType, actor };
    // Whether the departing actor has work this swap will autosave. Captured
    // before the swap because `swapActor` reloads the editor onto the target.
    const departingActor = selectedActor;
    const departingHadWork = editor.canFinalize;
    const result = await editor.swapActor(target);
    if (!result.ok) {
      // Abort the swap: keep the current actor active, surface the save
      // failure via the CTA's existing error path. This is the one path that
      // must not swap — the departing working meal is preserved.
      saveErrorMessage = result.error;
      return;
    }
    selectedActor = actor;
    // Remember that the departing actor's real work was autosaved by a swap.
    // Landing back on such an actor (now a clean, saved edit) shows the forward
    // "Hotovo" exit as reassurance the work took (see `isDoneState`). Tracked
    // per-actor, not as a session-wide latch: merely cycling between two
    // already-clean saved meals autosaves nothing and adds nobody, so returning
    // to an unedited actor keeps the plain disabled "Uložit změny" (issue #587).
    if (departingHadWork) autosavedActors.add(departingActor);
  }

  /**
   * Actors whose real work was autosaved by a swap this session. An actor lands
   * here when the user swaps away from it while it had confirmed work; returning
   * to it (now a clean, saved edit) shows the forward "Hotovo" exit as
   * reassurance the work took (see `isDoneState`). Never populated on direct
   * entry, so the ordinary clean-edit CTA contract is untouched. Tracking is
   * per-actor rather than a session-wide flag: cycling between two already-clean
   * saved meals autosaves nothing, adds nobody, and so leaves an unedited actor
   * showing the plain disabled "Uložit změny" (issue #587). `isDoneState` also
   * gates on `!editor.canFinalize`, so an actor drops out of "done" the instant
   * it is edited again, routing the CTA back through save.
   */
  const autosavedActors = new SvelteSet<Actor>();

  // ── Editor + slot hydration on mount ─────────────────────
  // The MealEditor (PRD #284) owns the meal lifecycle from open to finalize:
  // load, hydration, working-meal mutation, and save. The route reaches
  // Dexie directly only for the delete action (see `handleDeleteConfirm`).
  // View state (drill-in, grid edit), navigation, dirtiness, and the
  // discard buffer stay in the route and are deferred to later slices of #284.
  const editor = createMealEditor();

  // The shared meal session, owned by `stores/meal-session.ts`, for the
  // route's own mutations that fall outside the editor's own lifecycle:
  // delete (explicit "Smazat jídlo" and an emptied-then-backed-out edit,
  // issue #588) and the copy-to-another-day flow (issue #606).

  // Hydrate the editor once on mount: either from the discard buffer (undo
  // navigation) or from Dexie (normal entry). Guarded by `editorMounted` so
  // asynchronous store updates after mount never re-run it and overwrite a
  // just-restored dirty edit (issue #299).
  let editorMounted = false;
  $effect(() => {
    if (editorMounted) return;
    editorMounted = true;
    const buf = get(discardBuffer);
    const isMealBuf =
      buf !== null &&
      (buf.kind === 'meal-compose' || buf.kind === 'meal-edit' || buf.kind === 'meal-delete');
    if (isMealBuf && buf.mealType === selectedMealType) {
      // Undo: we navigated back to the slot the buffer was captured for.
      // The buffer is captured for back-out (compose or edit) AND post-delete
      // restores. The right edit-vs-compose framing depends on `kind`:
      //  - `meal-delete`: the persisted meal is gone from Dexie → finalize must
      //    mint a fresh record (compose-new), so `editingExisting = false`.
      //  - `meal-edit`:   the persisted meal is still in Dexie → re-treat as edit;
      //    finalize updates in place. The load snapshot is taken from the
      //    persisted record so the rehydrated dirty edit still reads dirty
      //    (issue #299): Uložit změny stays enabled and a second back-out
      //    re-buffers rather than silently dropping the user's restored work.
      //  - `meal-compose`: the slot was empty before, still empty → compose-new.
      clearBuffer();
      void editor.applyUndo(currentSlot, buf);
      return;
    }

    void editor.open(currentSlot);
  });

  // When the feeding stage resolves asynchronously after mount and the seeded
  // actor is no longer eligible (e.g. solids landing while `selectedActor`
  // still defaulted to `mother`), snap to the stage's implicit actor and
  // re-open on its slot. `selectActor` no-ops when already correct, so this
  // fires at most once per stage change.
  $effect(() => {
    const [implicit] = eligibleActors;
    if (implicit && !eligibleActors.includes(selectedActor)) {
      // Involuntary correction of the `mother` seed, not a user swap — flip
      // and plain-reload. No swap-on-dirty autosave: the user never chose the
      // departing actor, so there is no work of theirs to preserve.
      selectedActor = implicit;
      void editor.open(currentSlot);
    }
  });

  // ── Working meal state ────────────────────────────────────
  // The editor owns the working meal, the live `notes`, and the dirtiness
  // derivation. The route binds `editor.notes` to the textarea and reads
  // `editor.dirty` / `editor.canFinalize` / `editor.finalizeKind` for the
  // CTA. View state (drill-in, grid edit) and navigation stay in the route.
  const workingMeal = $derived<WorkingMeal>(editor.workingMeal);
  const editingExisting = $derived(editor.editingExisting);
  /** True while the ⋯ overflow action list (copy / delete) is open. */
  let overflowOpen = $state(false);
  /** True while the destructive delete-confirm sheet is open (opened FROM the overflow list). */
  let deleteConfirmOpen = $state(false);
  /** True while the copy-destination picker (day strip + slot sheet) is open. */
  let copyPickerOpen = $state(false);
  /** The day currently selected in the copy-destination picker. Defaults to the source day. */
  let copyDestDate = $state<string>('');
  /** True while the copy slot sheet (FabActionSheet in copy mode) is open. */
  let copySlotSheetOpen = $state(false);

  // ── View state ────────────────────────────────────────────
  // Drill-in is **shallow-routed** (issue #262): each drill-in entry pushes a
  // history entry and mirrors the family id into `page.state.drilledFamily`.
  // Browser/Android back fires popstate; the `beforeNavigate` guard inspects
  // the next `page.state` and unwinds local `drilledFamily` accordingly. The
  // local `$state` is the source of truth for rendering — `page.state` only
  // gates whether popstate is "leave the route" or "exit a drill-in".
  // (On hard reload `page.state` is empty → land on grid; consistent with
  // the in-memory working meal already being lost on reload.)
  let drilledFamily = $state<FamilyId | null>(null);
  /** Working-list row currently open for inline editing (grid view only). */
  let gridEditingFoodId = $state<string | null>(null);

  // ── Derived working-meal helpers ──────────────────────────
  const confirmedFoods = $derived(editor.confirmedFoods);
  const hasConfirmed = $derived(confirmedFoods.length > 0);

  const currentEditingFood = $derived(
    drilledFamily ? getEditingFood(workingMeal, drilledFamily) : null,
  );
  /** The food currently open for inline editing on the grid. */
  const gridEditingFood = $derived(() => {
    if (!gridEditingFoodId) return null;
    for (const fam of workingMeal.families) {
      const f = fam.foods.find((fd) => fd.foodId === gridEditingFoodId);
      if (f) return { food: f, familyId: fam.familyId };
    }
    return null;
  });

  /** Foods displayed in the grid working-list: all active foods in their original order. */
  const gridListFoods = $derived(() => {
    return workingMeal.families.flatMap((fam) =>
      fam.foods.filter(
        (f) =>
          f.state.status === 'confirmed' ||
          f.state.status === 'editing' ||
          (f.state.status === 'locked' && f.state.prior === 'confirmed'),
      ),
    );
  });

  const customFoods = $derived(
    [...$harvestCandidateSession]
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .map((c) => ({
        foodId: `other:${c.normalizedKey}`,
        name: c.rawForms[c.rawForms.length - 1] ?? c.normalizedKey,
      })),
  );

  // ── CTA label ─────────────────────────────────────────────
  // The screen reads as one consistent "Uložit {what}" ladder (issue #277,
  // ADR-0018):
  //   drill-in editing a food   → "Uložit {Food}"
  //   drill-in commit a family  → "Uložit {Family}"
  //   grid editing a list row   → "Uložit {Food}"
  //   finalize compose-new      → "Uložit {MealType}"  (e.g. "Uložit Oběd")
  //   finalize edit (any state) → "Uložit změny"       (named the change,
  //                                                     not the meal type, to
  //                                                     keep update legible)
  const ctaLabel = $derived(() => {
    if (drilledFamily) {
      if (currentEditingFood) {
        return `${actionStrings.save} ${currentEditingFood.name}`;
      }
      return `${actionStrings.save} ${familyStrings[drilledFamily].name}`;
    }
    const ge = gridEditingFood();
    if (ge) {
      return `${actionStrings.save} ${ge.food.name}`;
    }
    // Clean saved meal with nothing left to finalize (typically after a
    // swap-on-dirty round-trip autosaved this actor's meal): the CTA reads as
    // a forward "done" exit to `returnTo`, not a disabled dead-end whose only
    // escape is the back arrow (issue #571 follow-up).
    if (isDoneState) {
      return actionStrings.done;
    }
    if (editor.finalizeKind === 'edit') {
      return actionStrings.saveChanges;
    }
    if (hasConfirmed) {
      return `${actionStrings.save} ${mealConfig[selectedMealType].label}`;
    }
    return actionStrings.save;
  });

  // ── Food tap handler ─────────────────────────────────────
  function handleFoodTap(foodId: string, name: string): void {
    if (!drilledFamily) return;
    const foods = foodsForFamily(workingMeal, drilledFamily);
    const existing = foods.find((f) => f.foodId === foodId);
    const status = existing?.state.status;

    if (status === 'editing') {
      editor.update((m) => cancelEditing(m, drilledFamily!, foodId));
    } else if (status === 'confirmed') {
      editor.update((m) => deselectFood(m, drilledFamily!, foodId));
    } else if (status !== 'locked') {
      editor.update((m) => startEditing(m, drilledFamily!, foodId, name));
    }
  }

  function handleAmountChange(foodId: string, amount: PortionKind): void {
    if (!drilledFamily) return;
    editor.update((m) => updateEditingAmount(m, drilledFamily!, foodId, amount));
  }

  function handlePreparationChange(foodId: string, prep: PreparationMethod | undefined): void {
    if (!drilledFamily) return;
    editor.update((m) => updateEditingPreparation(m, drilledFamily!, foodId, prep));
  }

  // ── CTA action ────────────────────────────────────────────
  /**
   * Finalize CTA disabledness (issue #277, #286). The button is disabled in
   * two cases — both surface to the user as "nothing to save right now":
   *  - Compose-new with zero foods (the empty-meal hint says so explicitly).
   *  - Editing an existing meal whose live state matches the load snapshot
   *    (a clean edit; back arrow is the right exit).
   * Both rules live inside `editor.canFinalize`. Sub-CTAs (food/family
   * inside the drill-in or grid edit row) gate the route-level disable here.
   */
  const finalizeDisabled = $derived(!drilledFamily && !gridEditingFoodId && !editor.canFinalize);

  /**
   * "Done" state (issue #571 follow-up): the currently-selected actor's clean,
   * already-saved meal, where a swap-on-dirty round-trip earlier autosaved that
   * actor's work. The autosave is invisible and leaves the returning actor with
   * nothing to finalize — the old disabled "Uložit změny" read as "your work
   * didn't take", so here the CTA offers a forward exit ("Hotovo" → `returnTo`)
   * instead. Gated on `autosavedActors.has(selectedActor)` so a plain clean edit
   * opened directly from the day view keeps the established back-arrow-to-exit
   * contract (#277/#286), and merely cycling between two unedited saved actors
   * never triggers it (#587); a dirty edit routes through the save CTA; a truly
   * empty meal falls through to `showEmptyHint`.
   */
  const isDoneState = $derived(
    autosavedActors.has(selectedActor) &&
      !drilledFamily &&
      !gridEditingFoodId &&
      editor.finalizeKind === 'edit' &&
      !editor.canFinalize &&
      hasConfirmed,
  );

  function handleCta(): void {
    if (drilledFamily) {
      if (currentEditingFood) {
        editor.update((m) => confirmFood(m, drilledFamily!, currentEditingFood.foodId));
      } else {
        editor.update((m) => commitFamily(m, drilledFamily!));
        drilledFamily = null;
        // Unwind the drill-in's pushed history entry so the grid is reached
        // by popping, not by stacking another entry on top.
        history.back();
      }
      return;
    }
    const ge = gridEditingFood();
    if (ge) {
      editor.update((m) => confirmFood(m, ge.familyId, ge.food.foodId));
      gridEditingFoodId = null;
      return;
    }
    // Clean saved meal: the CTA is a forward "done" exit to the day overview,
    // not a save (there is nothing to persist). See `isDoneState`.
    if (isDoneState) {
      goto(returnTo);
      return;
    }
    // Finalize: persist. Guard: a disabled CTA is a no-op (clean edit, or
    // empty compose).
    if (finalizeDisabled) return;
    void saveMeal();
  }

  function handleGridRowTap(foodId: string, name: string, familyId: FamilyId): void {
    if (gridEditingFoodId === foodId) {
      // Re-tap: confirm back (collapses editor, food stays in list)
      editor.update((m) => confirmFood(m, familyId, foodId));
      gridEditingFoodId = null;
    } else {
      // Confirm any currently-editing food first, then open the tapped one
      const ge = gridEditingFood();
      if (ge) {
        editor.update((m) => confirmFood(m, ge.familyId, ge.food.foodId));
      }
      editor.update((m) => startEditing(m, familyId, foodId, name));
      gridEditingFoodId = foodId;
    }
  }

  function handleGridRowAmountChange(
    foodId: string,
    familyId: FamilyId,
    amount: PortionKind,
  ): void {
    editor.update((m) => updateEditingAmount(m, familyId, foodId, amount));
  }

  function handleGridRowPreparationChange(
    foodId: string,
    familyId: FamilyId,
    prep: PreparationMethod | undefined,
  ): void {
    editor.update((m) => updateEditingPreparation(m, familyId, foodId, prep));
  }

  function handleGridRowRemove(foodId: string, familyId: FamilyId): void {
    if (gridEditingFoodId === foodId) gridEditingFoodId = null;
    editor.update((m) => removeFood(m, familyId, foodId));
  }

  function handleGridContainerClick(e: MouseEvent): void {
    if (!gridEditingFoodId) return;
    if (!(e.target as Element).closest('[data-food-tile]')) {
      const ge = gridEditingFood();
      if (ge) {
        editor.update((m) => confirmFood(m, ge.familyId, ge.food.foodId));
        gridEditingFoodId = null;
      }
    }
  }

  /**
   * Pair a discard descriptor with this slot's identity
   * (`mealType`/`actor`/`date`/`returnTo`) and write it to the undo buffer.
   * Every buffer write for this route goes through here so the slot-metadata
   * clump lives in exactly one place — `saveMeal` (emptied-then-saved delete),
   * `bufferDiscard` (back-out), and `handleDeleteConfirm` (explicit delete) all
   * call it. It writes the buffer only; removing the persisted Dexie row is the
   * caller's concern (finalize already removes on save; the other two paths
   * call `mealSession.remove` themselves).
   */
  function writeSlotBuffer(desc: { kind: MealDiscardKind; workingMeal: WorkingMeal }): void {
    writeBuffer({
      ...desc,
      mealType: selectedMealType,
      actor: selectedActor,
      date: targetDate,
      returnTo,
    });
  }

  async function saveMeal(): Promise<void> {
    // US-17 (issue #606): a manual edit/save of a slot that a copy just wrote
    // to must invalidate that copy's undo buffer, so a later undo can never
    // trim/delete food the mother added by hand after the copy. A save that
    // itself writes a fresh buffer (emptied-then-deleted) overwrites it; a
    // plain edit-save writes none, so clear it explicitly here.
    invalidateStaleCopyBuffer();
    // Capture the delete descriptor BEFORE finalize removes the row, so an
    // emptied-then-saved meal can be undone (issue #588). finalize reports
    // whether it saved or deleted; only on 'deleted' do we surface the
    // delete toast — a normal save navigates back silently as before.
    const deleteDesc = editor.discardDescriptor('delete');
    const result = await editor.finalize();
    if (!result.ok) {
      // Surface the failure and stay on the meal page — navigating away would
      // silently evict the unsaved working meal.
      saveErrorMessage = result.error;
      return;
    }
    // finalize already removed the row on 'deleted' — write the undo buffer
    // only (bufferDiscard would remove a second time). deleteDesc is non-null
    // because the 'delete' intent always yields a descriptor.
    if (result.data === 'deleted' && deleteDesc) {
      writeSlotBuffer(deleteDesc);
    }
    goto(returnTo);
  }

  /**
   * US-17 buffer invalidation (issue #606). Clears the single-slot discard
   * buffer when it holds a `meal-copy` descriptor whose destination is the slot
   * currently being edited — so a manual edit/delete/further copy of that slot
   * strips the stale copy-undo, which could otherwise trim or delete food the
   * mother added by hand after the copy. A no-op for any other buffer kind or a
   * copy targeting a different slot.
   */
  function invalidateStaleCopyBuffer(): void {
    const buf = get(discardBuffer);
    if (buf?.kind !== 'meal-copy') return;
    const s = buf.destinationSlot;
    if (s.date === targetDate && s.mealType === selectedMealType && s.actor === selectedActor) {
      clearBuffer();
    }
  }

  // ── Header title ──────────────────────────────────────────
  // Grid state: meal-type label only (e.g. "Oběd") — issue #278. The label
  // tells the mother which slot she's editing without an emoji prefix.
  // Drill-in: family icon + family name (e.g. "🥛 Mléko"). Both render in
  // the large `.page-heading` style so the screen reads at "Dnes" weight.
  const headerTitle = $derived(() => {
    if (!drilledFamily) return mealConfig[selectedMealType].label;
    const family = FAMILIES.find((f) => f.id === drilledFamily);
    const name = familyStrings[drilledFamily].name;
    return family ? `${family.icon} ${name}` : name;
  });

  function handleBack(): void {
    if (drilledFamily) {
      drilledFamily = null;
      // Unwind the drill-in's pushed history entry so popstate-back (system
      // back gesture) and arrow-back produce identical history.
      history.back();
    } else {
      discardAndLeave();
    }
  }

  /**
   * Pair a discard descriptor with the slot metadata and write it to the
   * buffer. When the descriptor is a `meal-delete` produced by *emptying* an
   * existing edit (issue #588), the persisted row must also be removed — the
   * editor only removes on `finalize()`, and a back-out never calls finalize.
   * Removal is fire-and-forget: the buffer (and thus undo) is already written,
   * and Dexie is the source of truth for the day view we navigate to.
   */
  function bufferDiscard(desc: { kind: MealDiscardKind; workingMeal: WorkingMeal }): void {
    writeSlotBuffer(desc);
    if (desc.kind === 'meal-delete') {
      void mealSession.remove(targetDate, selectedMealType, selectedActor);
    }
  }

  /**
   * Single discard + navigate path used by the explicit back arrow's grid
   * branch. The editor decides *what* the discard contains (kind +
   * working meal); the route pairs that with `mealType`/`returnTo` and
   * decides *when* to write the buffer. A clean back-out from edit mode
   * yields a `null` descriptor — there is nothing to discard. An emptied edit
   * yields a `meal-delete` descriptor, which also removes the row (issue #588).
   *
   * Extracted (rather than inlined) so the popstate guard can call it later
   * if a future entry point ships a `returnTo` that's decoupled from the
   * previous history entry — at which point `cancel()` + `discardAndLeave()`
   * becomes necessary to keep arrow and gesture on the same destination.
   * See the `beforeNavigate` block below.
   */
  function discardAndLeave(): void {
    const desc = editor.discardDescriptor();
    if (desc) bufferDiscard(desc);
    goto(returnTo);
  }

  // ── Discard guard exit-path-completeness (issue #262 / ADR-0018) ────────
  // Two cooperating mechanisms close the popstate hole left by the
  // click-only `handleBack`:
  //
  // 1. Native popstate listener: `pushState` on drill-in entry is a SvelteKit
  //    **shallow route** — popping the shallow entry updates `page.state`
  //    and dispatches `popstate` on `window`, but does NOT call
  //    `beforeNavigate` (no real navigation). We sync local `drilledFamily`
  //    from `history.state` here so a system-back from a drill-in returns
  //    to the grid without leaving `/meal`.
  //
  // 2. `beforeNavigate` chokepoint: fires on every navigation kind that DOES
  //    leave `/meal` (`link`, `goto`, `popstate`, `form`, `leave`). We act
  //    only on `popstate` — the explicit arrow's `goto(returnTo)` arrives
  //    as `goto` and is short-circuited, so the buffer is written by exactly
  //    one path per navigation. Without this gate, the arrow would
  //    `writeBuffer → goto`, re-enter as `goto`, and write again.
  //
  // The drill-in case never reaches `beforeNavigate` (shallow popstate
  // bypasses it) — checking `drilledFamily` here is a belt-and-braces guard
  // for a hypothetical edge where SvelteKit decides to treat the shallow
  // pop as a real navigation.
  //
  // Note: the issue's original design called for `nav.cancel()` +
  // `goto(returnTo)` to handle a future case where `returnTo` is decoupled
  // from the previous history entry (e.g. some other screen's FAB → `/meal`
  // with `returnTo=/day/<today>`). That entry point doesn't exist in v1 — every
  // call site (`MealCard`, `FabActionSheet`) sets `returnTo=/day/<that day>`
  // matching the previous history entry. So we let popstate proceed
  // natively. If a mismatched-returnTo entry ships later, this handler is
  // the right place to add `nav.cancel()` + `goto(returnTo)`, sequenced via
  // `tick()` to avoid racing SvelteKit's own `history.go(-delta)` undo.
  $effect(() => {
    function syncDrillFromHistory(): void {
      const sk: Record<string, unknown> | undefined = (history.state ?? {})['sveltekit:states'];
      const stateDrill = (sk ?? {})['drilledFamily'] as FamilyId | undefined;
      drilledFamily = stateDrill ?? null;
    }
    window.addEventListener('popstate', syncDrillFromHistory);
    return () => window.removeEventListener('popstate', syncDrillFromHistory);
  });

  beforeNavigate((nav) => {
    if (nav.type !== 'popstate') return;
    if (drilledFamily) return;
    const desc = editor.discardDescriptor();
    if (desc) bufferDiscard(desc);
  });

  function handleFamilySelect(familyId: FamilyId): void {
    if (gridEditingFoodId) return;
    drilledFamily = familyId;
    // Shallow-route the drill-in into the history stack so Android system
    // back / browser back from the drill-in pops to the grid (handled by the
    // `beforeNavigate` popstate branch below) rather than leaving `/meal`.
    // The page URL is unchanged — only `$page.state` carries the family id.
    pushState('', { drilledFamily: familyId });
  }

  function handleCancelEdit(): void {
    if (!drilledFamily) return;
    const editing = getEditingFood(workingMeal, drilledFamily);
    if (editing) {
      editor.update((m) => cancelEditing(m, drilledFamily!, editing.foodId));
    }
  }

  async function handleNewCustomFood(rawName: string): Promise<void> {
    if (!drilledFamily) return;
    const key = normalizeKey(rawName);
    if (!key) return;
    const foodId = `other:${key}`;
    const existing = await harvestCandidateSession.readByKey(key);
    const candidate = mergeCandidate(
      existing.ok ? existing.data : null,
      rawName,
      key,
      new Date().toISOString(),
    );
    await harvestCandidateSession.upsert(candidate);
    await tick();
    handleFoodTap(foodId, rawName);
  }

  // ── Save-failure toast ────────────────────────────────────
  let saveErrorMessage = $state<string | null>(null);

  // ── Empty-meal hint (issue #268, repurposed #588) ─────────
  // Shown while editing an existing meal whose working list is empty — tells
  // the user that saving/leaving now deletes the meal (emptying is a delete,
  // #588). On compose-new the disabled CTA carries "nothing to save" implicitly.
  const showEmptyHint = $derived(
    editingExisting && !drilledFamily && !gridEditingFoodId && !hasConfirmed,
  );

  // ── Delete (issue #268) ───────────────────────────────────
  async function handleDeleteConfirm(): Promise<void> {
    deleteConfirmOpen = false;
    // US-17 (issue #606): a manual delete of a slot a copy just wrote to must
    // invalidate that copy's undo buffer before the delete writes its own.
    invalidateStaleCopyBuffer();
    // Capture the discard descriptor BEFORE the remove call so undo can
    // rehydrate. The 'delete' intent is explicit: the editor cannot infer
    // that the user just deleted from its own state.
    const desc = editor.discardDescriptor('delete');
    const result = await mealSession.remove(targetDate, selectedMealType, selectedActor);
    if (!result.ok) {
      saveErrorMessage = result.error;
      return;
    }
    if (desc) {
      writeSlotBuffer(desc);
    }
    goto(returnTo);
  }

  // ── Copy meal (spec #599, issue #606) ─────────────────────
  // Variant D′: the copy affordance appears in the ⋯ overflow list only when
  // the source meal has ≥1 food (a notes-only / zero-food meal has nothing to
  // copy). Picking it opens a destination picker: a DayStrip then a slot sheet
  // pre-filled to the source slot. Every cell the strip renders is a legal
  // destination (§3e), and the actor is fixed to the source meal's actor.
  const canCopy = $derived(editingExisting && confirmedFoods.length > 0);

  function openCopyPicker(): void {
    overflowOpen = false;
    copyDestDate = targetDate;
    copyPickerOpen = true;
  }

  // The copy picker's own day strip: same §3a input as the day overview, with
  // `selectedDate` = the currently picked destination. Live earliest-logged so
  // the destination range grows the instant an earlier day is logged.
  const earliestLogged = $derived($earliestLoggedStore);
  const copyStripCells = $derived(
    computeDayStrip({
      selectedDate: copyDestDate || targetDate,
      earliestLogged,
      today: todayIso(),
    }).cells,
  );

  // Every cell the strip renders is a legal destination: the range ends at
  // today (no future cell) and the loggable-window guard is gone (§3e), so a
  // pick simply records the tapped day — no destination gate.
  function selectCopyDestDate(date: string): void {
    copyDestDate = date;
  }

  function openCopySlotSheet(): void {
    copySlotSheetOpen = true;
  }

  function closeCopyPicker(): void {
    copyPickerOpen = false;
    copySlotSheetOpen = false;
  }

  // Resolve → assemble → save → branch on the Result. Actor is fixed to the
  // source meal's actor, so the merge target is resolved actor-scoped
  // (`loadBySlot(destDate, destSlot, source.actor)`): the OTHER actor's meal in
  // the same visual cell is irrelevant and untouched.
  async function confirmCopy(destMealType: MealType): Promise<void> {
    const srcResult = await mealSession.loadBySlot(targetDate, selectedMealType, selectedActor);
    if (!srcResult.ok || !srcResult.data) {
      closeCopyPicker();
      return;
    }
    const source = srcResult.data;
    const destSlot: MealSlot = { date: copyDestDate, mealType: destMealType, actor: selectedActor };
    const targetResult = await mealSession.loadBySlot(copyDestDate, destMealType, selectedActor);
    if (!targetResult.ok) {
      saveErrorMessage = targetResult.error;
      return;
    }
    const target = targetResult.data;
    const { meal, added } = copyMealInto(source, target, destSlot);
    // No-op signal (self-copy / full overlap): write nothing, navigate nothing,
    // no toast.
    if (!meal) {
      closeCopyPicker();
      return;
    }
    const saveResult = await mealSession.save(meal);
    if (!saveResult.ok) {
      // Save failure (Dexie quota / transaction error): surface the toast and
      // stay on the day picker — dismiss the slot sheet so the toast is readable
      // and the mother can retry. No navigation, no success toast.
      copySlotSheetOpen = false;
      saveErrorMessage = commonStrings.meal.copyFailedToast;
      return;
    }
    // Success: capture the undo descriptor, navigate to the destination day,
    // then raise the success toast after navigation settles (US-25). The toast
    // is layout-level and reactive on the discard buffer, so writing the buffer
    // only after `goto` resolves guarantees it renders on the destination day
    // rather than on the /meal editor being left behind.
    const descriptor: DiscardedMealCopy = {
      kind: 'meal-copy',
      destinationSlot: destSlot,
      addedItemIds: added.map((i) => i.id),
      destinationPreexisted: target !== null,
      priorUpdatedAt: target?.updatedAt,
      date: copyDestDate,
      returnTo: `/day/${copyDestDate}`,
    };
    closeCopyPicker();
    await goto(`/day/${copyDestDate}`);
    writeBuffer(descriptor);
  }
</script>

<div class="page-container pb-24">
  <!-- Sticky header -->
  <div class="bg-surface sticky top-0 z-20">
    <PageHeader title={headerTitle()} variant="large" onBack={handleBack} bordered={false}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(targetDate)}</p>
        {#if editingExisting && !drilledFamily}
          <button
            type="button"
            aria-label={actionStrings.more}
            class="text-text-muted -mr-2 ml-1 px-2 text-lg leading-none"
            onclick={() => (overflowOpen = true)}>⋯</button
          >
        {/if}
      {/snippet}
    </PageHeader>

    <!-- Actor picker (issue #569): full-width Já / Miminko pills, shown only
         in `mixed` where more than one actor may log. Single-actor stages
         render no picker — the actor is implicit. Hidden while drilled into a
         family so the pills don't compete with the drill-in chrome. -->
    {#if showActorPicker && !drilledFamily}
      <div class="flex gap-2 px-4 pt-2 pb-1">
        {#each eligibleActors as actor (actor)}
          <Chip active={actor === selectedActor} class="flex-1" onclick={() => selectActor(actor)}>
            {actorConfig[actor].label}
          </Chip>
        {/each}
      </div>
    {/if}

    <!-- Meal type is fixed at entry (ADR-0018) — no pills here. -->
  </div>

  <div class="space-y-5 px-4 pt-4">
    <!-- Family grid or drill-in -->
    <div>
      {#if drilledFamily}
        <FamilyDrillIn
          familyId={drilledFamily}
          foods={foodsForFamily(workingMeal, drilledFamily)}
          customFoods={drilledFamily === 'custom' ? customFoods : []}
          onFoodTap={handleFoodTap}
          onAmountChange={handleAmountChange}
          onPreparationChange={handlePreparationChange}
          onCancelEdit={handleCancelEdit}
          onNewCustomFood={handleNewCustomFood}
        />
      {:else}
        <div role="presentation" onclick={handleGridContainerClick}>
          <!-- Confirmed foods summary (editable working list) -->
          {#if hasConfirmed || gridEditingFoodId}
            <div class="mb-5">
              <p class="eyebrow mb-2">{commonStrings.meal.confirmedFoodsLabel}</p>
              <div class="space-y-1.5">
                {#each gridListFoods() as food (food.foodId)}
                  {@const fam = workingMeal.families.find((f) =>
                    f.foods.some((fd) => fd.foodId === food.foodId),
                  )}
                  {@const familyId = fam?.familyId}
                  {@const isEditing = food.state.status === 'editing'}
                  {@const isConfirmed = food.state.status === 'confirmed'}
                  {@const isLockedConfirmed =
                    food.state.status === 'locked' && food.state.prior === 'confirmed'}
                  {@const tileState = isEditing ? 'editing' : isConfirmed ? 'confirmed' : 'locked'}
                  {@const lockedPriorVal = isLockedConfirmed ? 'confirmed' : undefined}
                  {@const amount =
                    isConfirmed && food.state.status === 'confirmed'
                      ? food.state.amount
                      : food.cachedAmount}
                  {@const prep =
                    isConfirmed && food.state.status === 'confirmed'
                      ? food.state.preparation
                      : food.cachedPreparation}
                  {@const summary = amount
                    ? `${portionStrings[amount].label}${prep ? ` · ${preparationStrings[prep].label}` : ''}`
                    : undefined}
                  <div data-food-tile>
                    <FoodTile
                      name={food.name}
                      state={tileState}
                      variant="list"
                      lockedPrior={lockedPriorVal}
                      summary={isEditing ? undefined : summary}
                      onclick={() => familyId && handleGridRowTap(food.foodId, food.name, familyId)}
                      onRemove={() => familyId && handleGridRowRemove(food.foodId, familyId)}
                    >
                      {#snippet editor()}
                        {#if food.state.status === 'editing'}
                          <FoodEditor
                            amount={food.state.amount}
                            preparation={food.state.preparation}
                            preparations={preparationsForFood(food.foodId)}
                            onAmountChange={(a) =>
                              familyId && handleGridRowAmountChange(food.foodId, familyId, a)}
                            onPreparationChange={(p) =>
                              familyId && handleGridRowPreparationChange(food.foodId, familyId, p)}
                          />
                        {/if}
                      {/snippet}
                    </FoodTile>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <p class="eyebrow mb-2">{commonStrings.meal.allCategoriesLabel}</p>
          <FamilyGrid onSelect={handleFamilySelect} />

          <!-- Meal notes -->
          <div class="mt-5">
            <label class="eyebrow mb-2 block" for="meal-notes">
              {commonStrings.meal.mealNotesLabel}
            </label>
            <textarea
              id="meal-notes"
              rows={2}
              bind:value={editor.notes}
              placeholder={commonStrings.meal.notesPlaceholder}
              class="input-base w-full resize-none bg-white px-4 py-2.5"
            ></textarea>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Sticky CTA -->
<div
  class="from-surface via-surface fixed right-0 bottom-0 left-0 z-30 bg-gradient-to-t to-transparent px-4 pt-2"
  style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
>
  <div class="mx-auto max-w-lg">
    {#if showEmptyHint}
      <p class="body-muted pb-2 text-center">{commonStrings.meal.emptyMealHint}</p>
    {/if}
    <button
      aria-disabled={finalizeDisabled && !isDoneState ? 'true' : 'false'}
      onclick={handleCta}
      class="w-full rounded-xl py-3 text-sm font-semibold transition-all
        {finalizeDisabled && !isDoneState
        ? 'bg-surface-dark text-text-muted cursor-default'
        : 'bg-primary text-white'}"
    >
      {ctaLabel()}
    </button>
  </div>
</div>

{#if saveErrorMessage}
  <Toast
    message={saveErrorMessage}
    type="error"
    onClose={() => {
      saveErrorMessage = null;
    }}
  />
{/if}

<!--
  ⋯ overflow action list (issue #606). A route-local bottom-sheet menu: the
  copy affordance (shown only when the source meal has ≥1 food) and the
  existing delete, which opens the unchanged destructive ConfirmSheet below.
-->
{#if overflowOpen}
  <BottomSheet
    open={overflowOpen}
    ariaLabel={actionStrings.more}
    onDismiss={() => (overflowOpen = false)}
    backdropTestid="overflow-backdrop"
  >
    {#if canCopy}
      <button
        type="button"
        data-testid="overflow-copy"
        class="border-surface-dark active:bg-surface text-text w-full border-b px-5 py-4 text-left text-[15px] font-semibold"
        onclick={openCopyPicker}>{actionStrings.copyMeal}</button
      >
    {/if}
    <button
      type="button"
      data-testid="overflow-delete"
      class="active:bg-surface text-danger w-full px-5 py-4 text-left text-[15px] font-semibold"
      onclick={() => {
        overflowOpen = false;
        deleteConfirmOpen = true;
      }}>{actionStrings.deleteMeal}</button
    >
    <button
      type="button"
      class="text-text-muted active:bg-surface w-full py-4 text-center text-[13px]"
      onclick={() => (overflowOpen = false)}>{actionStrings.cancel}</button
    >
  </BottomSheet>
{/if}

<!--
  Destructive-confirm bottom sheet (issue #268, ADR-0018). Delete keeps its own
  confirmation step exactly as before — the overflow list opens this sheet.
  Extracted to ConfirmSheet (issue #390) so /skin can reuse the same shape.
-->
<ConfirmSheet
  open={deleteConfirmOpen}
  heading={commonStrings.meal.deleteConfirmHeading}
  body={commonStrings.meal.deleteConfirmBody}
  confirmLabel={actionStrings.deleteMeal}
  cancelLabel={actionStrings.cancel}
  onConfirm={handleDeleteConfirm}
  onCancel={() => (deleteConfirmOpen = false)}
/>

<!--
  Copy-destination picker (variant D′, spec #599 / issue #606). A DayStrip whose
  future + out-of-window days are disabled, then a slot sheet (FabActionSheet in
  copy mode) pre-filled to the source slot. Merge is silent: every target reads
  "Kopírovat sem", no occupancy cues.
-->
{#if copyPickerOpen}
  <BottomSheet
    open={copyPickerOpen}
    ariaLabel={commonStrings.meal.copyPickerHeading}
    onDismiss={closeCopyPicker}
    backdropTestid="copy-picker-backdrop"
  >
    <div class="px-5 pt-4 pb-2 text-center">
      <p class="text-text-muted text-[11px] tracking-wide uppercase">
        {commonStrings.meal.copyPickerHeading}
      </p>
    </div>
    <div class="border-surface-dark mx-5 border-t"></div>
    <div class="pt-2">
      <DayStrip cells={copyStripCells} today={todayIso()} onselectdate={selectCopyDestDate} />
    </div>
    <div class="px-5 pt-1 pb-2">
      <button
        type="button"
        data-testid="copy-pick-slot"
        class="bg-primary w-full rounded-xl py-3 text-sm font-semibold text-white"
        onclick={openCopySlotSheet}>{actionStrings.copyHere}</button
      >
    </div>
  </BottomSheet>
{/if}

{#if copySlotSheetOpen}
  <FabActionSheet
    date={copyDestDate}
    initialMealSubmenu={true}
    preselectedType={selectedMealType}
    onclose={closeCopyPicker}
    onSelectMealType={(type) => void confirmCopy(type)}
  />
{/if}
