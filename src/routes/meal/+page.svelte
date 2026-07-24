<script lang="ts">
  import { tick } from 'svelte';
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import { get } from 'svelte/store';
  import { getCategoryConfig } from '$lib/config/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, reintroDayLabel } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import { familyStrings } from '$lib/strings/families';
  import { formForFood } from '$lib/domain/preparation-rules';
  import { formatDateLongCs, todayIso } from '$lib/utils/date';
  import { isWithinLoggableWindow } from '$lib/domain/policy';
  import { scheduleRaw } from '$lib/stores/schedule-context';
  import { buildScheduleContext } from '$lib/domain/schedule-queries';
  import { rungAtDayInPhase } from '$lib/domain/ladder';
  import { V1_FEEDING_STAGE } from '$lib/domain/canonical-allergen';
  import { parseDayQuery } from '$lib/utils/day-query';
  import Toast from '$lib/components/Toast.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
  import FamilyGrid from '$lib/components/FamilyGrid.svelte';
  import FamilyDrillIn from '$lib/components/FamilyDrillIn.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';
  import FoodTile from '$lib/components/FoodTile.svelte';

  import { goto, beforeNavigate, pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { db } from '$lib/db/atopic-db';
  import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
  import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
  import { harvestCandidateSession } from '$lib/stores/harvest-candidate-session';
  import { createMealEditor } from '$lib/stores/meal-editor.svelte';
  import { normalizeKey, mergeCandidate } from '$lib/domain/harvest-candidate';

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

  // ── Schedule context ──────────────────────────────────────
  const { date: targetDate, returnTo } = $derived(parseDayQuery(page.url));
  const raw = $derived($scheduleRaw);
  const catalog = new BundledCatalogAdapter();
  const ctx = $derived(
    raw.status === 'ready'
      ? buildScheduleContext({ schedule: raw.schedule, answers: raw.answers }, targetDate, catalog)
      : null,
  );
  const eliminatedToday = $derived(ctx?.eliminatedToday ?? []);
  const reintroInfo = $derived(ctx?.reintroInfo ?? null);
  // Passive hint (issue #440) — a stale row can be edited freely, but the
  // mother should know its date no longer sits inside the protocol window.
  const isOutOfWindow = $derived(
    raw.status === 'ready' &&
      !isWithinLoggableWindow(targetDate, raw.schedule.startDate, raw.schedule.estimatedEndDate),
  );

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

  // ── Editor + slot hydration on mount ─────────────────────
  // The MealEditor (PRD #284) owns the meal lifecycle from open to finalize:
  // load, hydration, working-meal mutation, and save. The route reaches
  // Dexie directly only for the delete action (see `handleDeleteConfirm`).
  // View state (drill-in, grid edit), navigation, dirtiness, and the
  // discard buffer stay in the route and are deferred to later slices of #284.
  const editor = createMealEditor();

  // Hydrate the editor once on mount: either from the discard buffer (undo
  // navigation) or from Dexie (normal entry). Splitting the buffer-vs-load
  // decision off from the eliminatedToday subscription is essential — when
  // the schedule loads asynchronously and `eliminatedToday` flips from `[]`
  // to its real value, this effect would re-run, the buffer would be empty
  // (already cleared), and the route would call `editor.open(...)` again,
  // overwriting the just-restored dirty edit (issue #299).
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
      // `eliminatedToday` is threaded so per-food danger styling and the red
      // CTA reappear after undo.
      clearBuffer();
      const slot = { date: targetDate, mealType: selectedMealType, actor: 'mother' as const };
      void editor.applyUndo(slot, buf, eliminatedToday);
      return;
    }

    void editor.open(
      { date: targetDate, mealType: selectedMealType, actor: 'mother' },
      eliminatedToday,
    );
  });

  // Keep the editor's elimination window in sync when the schedule loads
  // asynchronously after mount.
  $effect(() => {
    editor.setEliminatedToday(eliminatedToday);
  });

  // ── Working meal state ────────────────────────────────────
  // The editor owns the working meal, the live `notes`, and the dirtiness
  // derivation. The route binds `editor.notes` to the textarea and reads
  // `editor.dirty` / `editor.canFinalize` / `editor.finalizeKind` for the
  // CTA. View state (drill-in, grid edit) and navigation stay in the route.
  const workingMeal = $derived<WorkingMeal>(editor.workingMeal);
  const editingExisting = $derived(editor.editingExisting);
  /** True while the destructive-confirm bottom sheet is open. */
  let overflowOpen = $state(false);

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

  const eliminatedAllergenIdStrings = $derived(eliminatedToday.map(String));

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

  async function saveMeal(): Promise<void> {
    const result = await editor.finalize();
    if (!result.ok) {
      // Surface the failure and stay on the meal page — navigating away would
      // silently evict the unsaved working meal.
      saveErrorMessage = result.error;
      return;
    }
    goto(returnTo);
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
   * Single discard + navigate path used by the explicit back arrow's grid
   * branch. The editor decides *what* the discard contains (kind +
   * working meal); the route pairs that with `mealType`/`returnTo` and
   * decides *when* to write the buffer. A clean back-out from edit mode
   * yields a `null` descriptor — there is nothing to discard.
   *
   * Extracted (rather than inlined) so the popstate guard can call it later
   * if a future entry point ships a `returnTo` that's decoupled from the
   * previous history entry — at which point `cancel()` + `discardAndLeave()`
   * becomes necessary to keep arrow and gesture on the same destination.
   * See the `beforeNavigate` block below.
   */
  function discardAndLeave(): void {
    const desc = editor.discardDescriptor();
    if (desc) {
      writeBuffer({ ...desc, mealType: selectedMealType, date: targetDate, returnTo });
    }
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
  // from the previous history entry (e.g. a `/week` FAB → `/meal` with
  // `returnTo=/day/<today>`). That entry point doesn't exist in v1 — every
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
    if (desc) {
      writeBuffer({ ...desc, mealType: selectedMealType, date: targetDate, returnTo });
    }
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

  // ── Conflict detection ────────────────────────────────────
  // The editor owns the food×eliminated-allergen intersection
  // (`editor.eliminatedFoodIds`, `editor.hasConflicts`) — computed via the
  // shared `detectConflicts` over its own foods, fed by the `eliminatedToday`
  // injected through `editor.open(..)`. The route builds the view-specific
  // danger flags (per-row danger styling, the red CTA gate, the
  // editing/family banners) on top of that set.
  const eliminatedFoodIds = $derived(editor.eliminatedFoodIds);
  /**
   * Red CTA condition restricted to the grid view (no drill-in, no grid row
   * edit). Narrower than `editor.hasConflicts` because the editor's set
   * includes editing-state foods too — but a grid view with no
   * `gridEditingFoodId` only has confirmed entries in practice, so this also
   * filters defensively to confirmed foods.
   */
  const hasConflicts = $derived(confirmedFoods.some((f) => eliminatedFoodIds.has(f.foodId)));
  /** True when the food being edited right now (drill-in or grid) is eliminated today. */
  const editingFoodIsEliminated = $derived(
    drilledFamily && currentEditingFood
      ? eliminatedFoodIds.has(currentEditingFood.foodId)
      : gridEditingFoodId
        ? eliminatedFoodIds.has(gridEditingFoodId)
        : false,
  );
  /** True when saving the whole family would commit at least one eliminated food. */
  const familySaveHasEliminated = $derived(
    drilledFamily !== null &&
      currentEditingFood === null &&
      foodsForFamily(workingMeal, drilledFamily).some(
        (f) =>
          (f.state.status === 'confirmed' || f.state.status === 'editing') &&
          eliminatedFoodIds.has(f.foodId),
      ),
  );

  // ── Save-failure toast ────────────────────────────────────
  let saveErrorMessage = $state<string | null>(null);

  // ── Empty-meal hint (issue #268) ──────────────────────────
  // Shown only while editing an existing meal whose working list is empty —
  // so the user is told to use Smazat instead of trying to "save zero foods".
  // On compose-new, the disabled CTA carries the message implicitly.
  const showEmptyHint = $derived(
    editingExisting && !drilledFamily && !gridEditingFoodId && !hasConfirmed,
  );

  // ── Delete (issue #268) ───────────────────────────────────
  async function handleDeleteConfirm(): Promise<void> {
    overflowOpen = false;
    // Capture the discard descriptor BEFORE the remove call so undo can
    // rehydrate. The 'delete' intent is explicit: the editor cannot infer
    // that the user just deleted from its own state.
    const desc = editor.discardDescriptor('delete');
    const result = await new DexieMealRepository(db, new DexieScheduleRepository(db)).remove(
      targetDate,
      selectedMealType,
      'mother',
    );
    if (!result.ok) {
      saveErrorMessage = result.error;
      return;
    }
    if (desc) {
      writeBuffer({ ...desc, mealType: selectedMealType, date: targetDate, returnTo });
    }
    goto(returnTo);
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

    <!-- Meal type is fixed at entry (ADR-0018) — no pills here. -->
    {#if !drilledFamily}
      <!-- Dosing guidance during reintroduction -->
      {#if reintroInfo}
        {@const cat = getCategoryConfig(reintroInfo.allergenId)}
        {@const rung = rungAtDayInPhase(
          catalog,
          reintroInfo.allergenId,
          reintroInfo.dayInPhase,
          V1_FEEDING_STAGE,
        )}
        <div class="space-y-1.5 px-4 pt-2">
          <InfoBanner variant="success">
            <p class="eyebrow text-success">
              {reintroDayLabel(reintroInfo.dayInPhase, reintroInfo.totalDays)}
            </p>
            <p class="caption mt-0.5">{rung?.dose ?? ''} ({cat?.name})</p>
          </InfoBanner>
        </div>
      {/if}
      {#if editingExisting && isOutOfWindow}
        <div class="space-y-1.5 px-4 pt-2">
          <InfoBanner variant="info">
            <p class="caption">{commonStrings.meal.outOfWindowHint}</p>
          </InfoBanner>
        </div>
      {/if}
    {/if}
  </div>

  <div class="space-y-5 px-4 pt-4">
    <!-- Family grid or drill-in -->
    <div>
      {#if drilledFamily}
        <FamilyDrillIn
          familyId={drilledFamily}
          foods={foodsForFamily(workingMeal, drilledFamily)}
          eliminatedAllergenIds={eliminatedAllergenIdStrings}
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
                  {@const isEliminated = eliminatedFoodIds.has(food.foodId)}
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
                      eliminatedStatus={isEliminated ? 'danger' : undefined}
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
                            form={formForFood(food.foodId)}
                            eliminatedVariant={isEliminated}
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
      aria-disabled={finalizeDisabled ? 'true' : 'false'}
      onclick={handleCta}
      class="w-full rounded-xl py-3 text-sm font-semibold transition-all
        {finalizeDisabled
        ? 'bg-surface-dark text-text-muted cursor-default'
        : editingFoodIsEliminated ||
            familySaveHasEliminated ||
            (hasConflicts && !drilledFamily && !gridEditingFoodId)
          ? 'bg-danger text-white'
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
  Destructive-confirm bottom sheet (issue #268, ADR-0018).
  Extracted to ConfirmSheet (issue #390) so /skin can reuse the same shape.
-->
<ConfirmSheet
  open={overflowOpen}
  heading={commonStrings.meal.deleteConfirmHeading}
  body={commonStrings.meal.deleteConfirmBody}
  confirmLabel={actionStrings.deleteMeal}
  cancelLabel={actionStrings.cancel}
  onConfirm={handleDeleteConfirm}
  onCancel={() => (overflowOpen = false)}
/>
