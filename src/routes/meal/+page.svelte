<script lang="ts">
  import { tick } from 'svelte';
  import type { Meal, MealType, PortionKind, PreparationMethod } from '$lib/domain/models';
  import { detectConflicts } from '$lib/domain/schedule-queries';
  import { ALLERGENS, FOODS, FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import { get } from 'svelte/store';
  import { getProtocolForAllergen } from '$lib/data/allergen-catalog';
  import { getCategoryConfig } from '$lib/config/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, reintroDayLabel } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import { familyStrings } from '$lib/strings/families';
  import { formatDateLongCs } from '$lib/utils/date';
  import { scheduleRaw } from '$lib/stores/schedule-context';
  import { buildScheduleContext } from '$lib/domain/schedule-queries';
  import { parseDayQuery } from '$lib/utils/day-query';
  import Toast from '$lib/components/Toast.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import MealTypePills from '$lib/components/MealTypePills.svelte';
  import FamilyGrid from '$lib/components/FamilyGrid.svelte';
  import FamilyDrillIn from '$lib/components/FamilyDrillIn.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';

  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { mealSession, createMealSession } from '$lib/stores/meal-session';
  import { harvestCandidateSession } from '$lib/stores/harvest-candidate-session';
  import { normalizeKey, mergeCandidate } from '$lib/domain/harvest-candidate';

  import {
    emptyWorkingMeal,
    fromMealItems,
    startEditing,
    confirmFood,
    cancelEditing,
    deselectFood,
    updateEditingAmount,
    updateEditingPreparation,
    commitFamily,
    removeFood,
    allConfirmedFoods,
    editingFood as getEditingFood,
    foodsForFamily,
    toMealItems,
    isNonEmpty,
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
      : null
  );
  const eliminatedToday = $derived(ctx?.eliminatedToday ?? []);
  const reintroInfo = $derived(ctx?.reintroInfo ?? null);

  // ── Meal type pills ──────────────────────────────────────
  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  type MealTypeKind = typeof mealTypes[number];
  function parseMealType(raw: string | null): MealTypeKind {
    return mealTypes.includes(raw as MealTypeKind) ? (raw as MealTypeKind) : 'lunch';
  }
  let selectedMealType = $state<MealTypeKind>(parseMealType(page.url.searchParams.get('type')));

  /**
   * The slot the working list was hydrated from (on mount or via a pill load).
   * A MOVE relabels `selectedMealType` but keeps this pointing at the origin, so
   * the source slot reads as free (excluded from `occupiedTypes`) and is deleted
   * on save when the meal is finalized under a different type (ADR-0019).
   */
  let loadedFromType = $state<MealTypeKind | null>(null);

  /** Reactive meal session for targetDate — re-created when date changes. */
  let dateScopedMealSession = $state(createMealSession(parseDayQuery(page.url).date));
  $effect(() => {
    dateScopedMealSession = createMealSession(targetDate);
  });

  /**
   * Meal types that already have a finalized meal for targetDate. The slot the
   * working list was loaded from is excluded — a MOVE has logically emptied it,
   * so returning to it is a MOVE-back, not a data-destroying switch-away.
   */
  const occupiedTypes = $derived(
    $dateScopedMealSession.map(m => m.mealType).filter(t => t !== loadedFromType)
  );

  // ── Initial hydration of the pre-selected slot ────────────
  // Landing on /meal?type=lunch must immediately surface that slot's persisted
  // foods. Without this the working list stays empty until a pill is tapped.
  let didInitialLoad = false;
  $effect(() => {
    if (didInitialLoad) return;
    didInitialLoad = true;
    // A restored discard buffer already populated the working list — keep it.
    if (isNonEmpty(workingMeal)) return;
    const type = selectedMealType;
    void mealSession.loadBySlot(targetDate, type).then((result) => {
      if (!result.ok || !result.data) return;
      // Guard against races: only apply if nothing changed meanwhile.
      if (type !== selectedMealType || isNonEmpty(workingMeal)) return;
      workingMeal = fromMealItems(result.data.items, result.data.notes ?? '');
      mealNotes = result.data.notes ?? '';
      loadedFromType = type;
    });
  });

  async function handlePillLoad(type: MealType): Promise<void> {
    selectedMealType = type;
    const result = await mealSession.loadBySlot(targetDate, type);
    if (result.ok && result.data) {
      workingMeal = fromMealItems(result.data.items, result.data.notes ?? '');
      mealNotes = result.data.notes ?? '';
      loadedFromType = type;
    } else {
      loadedFromType = null;
    }
  }

  function handlePillMove(type: MealType): void {
    selectedMealType = type;
  }

  function handlePillSwitchAway(type: MealType): void {
    writeBuffer({ workingMeal, mealType: selectedMealType, returnTo });
    goto(`/meal?returnTo=${encodeURIComponent(returnTo)}&type=${type}&date=${targetDate}`);
  }

  // ── Working meal state ────────────────────────────────────
  function initialWorkingMeal(): WorkingMeal {
    const buf = get(discardBuffer);
    if (buf) {
      clearBuffer();
      return buf.workingMeal;
    }
    return emptyWorkingMeal();
  }
  let workingMeal = $state<WorkingMeal>(initialWorkingMeal());
  let mealNotes = $state('');

  // ── View state ────────────────────────────────────────────
  let drilledFamily = $state<FamilyId | null>(null);
  /** Working-list row currently open for inline editing (grid view only). */
  let gridEditingFoodId = $state<string | null>(null);

  // ── Derived working-meal helpers ──────────────────────────
  const confirmedFoods = $derived(allConfirmedFoods(workingMeal));
  const hasConfirmed = $derived(confirmedFoods.length > 0);

  const currentEditingFood = $derived(
    drilledFamily ? getEditingFood(workingMeal, drilledFamily) : null
  );
  /** The food currently open for inline editing on the grid. */
  const gridEditingFood = $derived(() => {
    if (!gridEditingFoodId) return null;
    for (const fam of workingMeal.families) {
      const f = fam.foods.find(fd => fd.foodId === gridEditingFoodId);
      if (f) return { food: f, familyId: fam.familyId };
    }
    return null;
  });

  /** Foods displayed in the grid working-list: all active foods in their original order. */
  const gridListFoods = $derived(() => {
    return workingMeal.families.flatMap(fam =>
      fam.foods.filter(f =>
        f.state.status === 'confirmed' ||
        f.state.status === 'editing' ||
        (f.state.status === 'locked' && f.state.prior === 'confirmed')
      )
    );
  });

  const activeFamilyIds = $derived(
    confirmedFoods.flatMap(f => {
      const food = FOODS.find(fd => fd.id === f.foodId);
      return food ? [food.familyId as FamilyId] : [];
    }).filter((v, i, a) => a.indexOf(v) === i)
  );

  const eliminatedFamilyIds = $derived(
    eliminatedToday.flatMap(allergenId => {
      const allergen = ALLERGENS.find(a => a.id === allergenId);
      return allergen ? [allergen.familyId as FamilyId] : [];
    }).filter((v, i, a) => a.indexOf(v) === i)
  );

  const eliminatedAllergenIdStrings = $derived(eliminatedToday.map(String));

  const customFoods = $derived(
    [...$harvestCandidateSession]
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .map(c => ({
        foodId: `other:${c.normalizedKey}`,
        name: c.rawForms[c.rawForms.length - 1] ?? c.normalizedKey,
      }))
  );

  // ── CTA label ─────────────────────────────────────────────
  const ctaLabel = $derived(() => {
    if (drilledFamily) {
      if (currentEditingFood) {
        return `${actionStrings.saveFood} ${currentEditingFood.name}`;
      }
      return `${actionStrings.saveFood} ${familyStrings[drilledFamily].name}`;
    }
    const ge = gridEditingFood();
    if (ge) {
      return `${actionStrings.saveFood} ${ge.food.name}`;
    }
    if (hasConfirmed) {
      return `${actionStrings.done} — ${mealConfig[selectedMealType].label}`;
    }
    return actionStrings.done;
  });

  // ── Food tap handler ─────────────────────────────────────
  function handleFoodTap(foodId: string, name: string): void {
    if (!drilledFamily) return;
    const foods = foodsForFamily(workingMeal, drilledFamily);
    const existing = foods.find(f => f.foodId === foodId);
    const status = existing?.state.status;

    if (status === 'editing') {
      workingMeal = cancelEditing(workingMeal, drilledFamily, foodId);
    } else if (status === 'confirmed') {
      workingMeal = deselectFood(workingMeal, drilledFamily, foodId);
    } else if (status !== 'locked') {
      workingMeal = startEditing(workingMeal, drilledFamily, foodId, name);
    }
  }

  function handleAmountChange(foodId: string, amount: PortionKind): void {
    if (!drilledFamily) return;
    workingMeal = updateEditingAmount(workingMeal, drilledFamily, foodId, amount);
  }

  function handlePreparationChange(foodId: string, prep: PreparationMethod | undefined): void {
    if (!drilledFamily) return;
    workingMeal = updateEditingPreparation(workingMeal, drilledFamily, foodId, prep);
  }

  // ── CTA action ────────────────────────────────────────────
  function handleCta(): void {
    if (drilledFamily) {
      if (currentEditingFood) {
        workingMeal = confirmFood(workingMeal, drilledFamily, currentEditingFood.foodId);
      } else {
        workingMeal = commitFamily(workingMeal, drilledFamily);
        drilledFamily = null;
      }
      return;
    }
    const ge = gridEditingFood();
    if (ge) {
      workingMeal = confirmFood(workingMeal, ge.familyId, ge.food.foodId);
      gridEditingFoodId = null;
      return;
    }
    // Hotovo: persist
    void saveMeal();
  }

  function handleGridRowTap(foodId: string, name: string, familyId: FamilyId): void {
    if (gridEditingFoodId === foodId) {
      // Re-tap: confirm back (collapses editor, food stays in list)
      workingMeal = confirmFood(workingMeal, familyId, foodId);
      gridEditingFoodId = null;
    } else {
      // Confirm any currently-editing food first, then open the tapped one
      const ge = gridEditingFood();
      if (ge) {
        workingMeal = confirmFood(workingMeal, ge.familyId, ge.food.foodId);
      }
      workingMeal = startEditing(workingMeal, familyId, foodId, name);
      gridEditingFoodId = foodId;
    }
  }

  function handleGridRowAmountChange(foodId: string, familyId: FamilyId, amount: PortionKind): void {
    workingMeal = updateEditingAmount(workingMeal, familyId, foodId, amount);
  }

  function handleGridRowPreparationChange(foodId: string, familyId: FamilyId, prep: PreparationMethod | undefined): void {
    workingMeal = updateEditingPreparation(workingMeal, familyId, foodId, prep);
  }

  function handleGridRowRemove(foodId: string, familyId: FamilyId): void {
    if (gridEditingFoodId === foodId) gridEditingFoodId = null;
    workingMeal = removeFood(workingMeal, familyId, foodId);
  }

  function handleGridContainerClick(e: MouseEvent): void {
    if (!gridEditingFoodId) return;
    if (!(e.target as Element).closest('[data-food-token]')) {
      const ge = gridEditingFood();
      if (ge) {
        workingMeal = confirmFood(workingMeal, ge.familyId, ge.food.foodId);
        gridEditingFoodId = null;
      }
    }
  }

  async function saveMeal(): Promise<void> {
    const items = toMealItems(workingMeal);
    if (items.length === 0) return;
    const meal: Meal = {
      id: `${targetDate}:${selectedMealType}`,
      date: targetDate,
      mealType: selectedMealType,
      actor: 'mother',
      items,
      notes: mealNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const result = await mealSession.save(meal);
    if (!result.ok) {
      // Surface the failure and stay on the meal page — navigating away would
      // silently evict the unsaved working meal.
      saveErrorMessage = result.error;
      return;
    }
    // MOVE semantics (ADR-0019): the working list came from another slot and was
    // relabeled. Now that it is persisted under the new type, empty the source so
    // the foods relocate rather than duplicate.
    if (loadedFromType && loadedFromType !== selectedMealType) {
      const removed = await mealSession.remove(targetDate, loadedFromType);
      if (!removed.ok) {
        saveErrorMessage = removed.error;
        return;
      }
    }
    goto(returnTo);
  }

  // ── Header title ──────────────────────────────────────────
  const headerTitle = $derived(() => {
    if (!drilledFamily) return commonStrings.meal.heading;
    const family = FAMILIES.find(f => f.id === drilledFamily);
    const name = familyStrings[drilledFamily].name;
    return family ? `${family.icon} ${name}` : name;
  });

  function handleBack(): void {
    if (drilledFamily) {
      drilledFamily = null;
    } else {
      if (isNonEmpty(workingMeal)) {
        writeBuffer({ workingMeal, mealType: selectedMealType, returnTo });
      }
      goto(returnTo);
    }
  }

  function handleFamilySelect(familyId: FamilyId): void {
    if (gridEditingFoodId) return;
    drilledFamily = familyId;
  }

  function handleCancelEdit(): void {
    if (!drilledFamily) return;
    const editing = getEditingFood(workingMeal, drilledFamily);
    if (editing) {
      workingMeal = cancelEditing(workingMeal, drilledFamily, editing.foodId);
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
  const conflicts = $derived(detectConflicts(confirmedFoods.map(f => ({
    id: f.foodId,
    name: f.name,
    foodId: f.foodId as import('$lib/domain/models').MealItem['foodId'],
    amount: (f.state.status === 'confirmed' ? f.state.amount : 'portion') as PortionKind,
  })), eliminatedToday, catalog));
  const hasConflicts = $derived(conflicts.length > 0);
  /** All working-list foods (confirmed or editing) that touch an eliminated allergen. */
  const allActiveFoods = $derived(
    workingMeal.families.flatMap(fam =>
      fam.foods.filter(f => f.state.status === 'confirmed' || f.state.status === 'editing')
    )
  );
  const eliminatedFoodIds = $derived(new Set(
    detectConflicts(allActiveFoods.map(f => ({
      id: f.foodId,
      name: f.name,
      foodId: f.foodId as import('$lib/domain/models').MealItem['foodId'],
      amount: 'portion' as PortionKind,
    })), eliminatedToday, catalog).map(c => c.foodId as string)
  ));
  /** True when the food being edited right now (drill-in or grid) is eliminated today. */
  const editingFoodIsEliminated = $derived(
    drilledFamily && currentEditingFood ? eliminatedFoodIds.has(currentEditingFood.foodId)
    : gridEditingFoodId ? eliminatedFoodIds.has(gridEditingFoodId)
    : false
  );
  /** True when saving the whole family would commit at least one eliminated food. */
  const familySaveHasEliminated = $derived(
    drilledFamily !== null && currentEditingFood === null &&
    foodsForFamily(workingMeal, drilledFamily).some(
      f => (f.state.status === 'confirmed' || f.state.status === 'editing') &&
           eliminatedFoodIds.has(f.foodId)
    )
  );

  // ── Save-failure toast ────────────────────────────────────
  let saveErrorMessage = $state<string | null>(null);
</script>

<div class="page-container pb-24">

  <!-- Sticky header -->
  <div class="sticky top-0 bg-surface z-20 border-b border-surface-dark">
    <PageHeader title={headerTitle()} onBack={handleBack}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(targetDate)}</p>
      {/snippet}
    </PageHeader>

    <!-- Meal type pills -->
    {#if !drilledFamily}
    <div class="px-4 pb-3">
      <MealTypePills
        currentType={selectedMealType}
        {occupiedTypes}
        isWorkingListNonEmpty={isNonEmpty(workingMeal)}
        onLoad={handlePillLoad}
        onMove={handlePillMove}
        onSwitchAway={handlePillSwitchAway}
      />
    </div>

    <!-- Dosing guidance during reintroduction -->
    {#if reintroInfo}
      {@const cat = getCategoryConfig(reintroInfo.allergenId)}
      {@const protocolDay = getProtocolForAllergen(reintroInfo.allergenId)?.days[reintroInfo.dayInPhase - 1]}
      <div class="px-4 pt-2 space-y-1.5">
        <InfoBanner variant="success">
          <p class="text-xs font-medium text-success">
            {reintroDayLabel(reintroInfo.dayInPhase, reintroInfo.totalDays)}
          </p>
          <p class="body-muted mt-0.5">{protocolDay?.instructionCs ?? ''} ({cat?.name})</p>
        </InfoBanner>
      </div>
    {/if}

    <!-- Schedule context banner -->
    {#if eliminatedToday.length > 0}
      <div class="px-4 pt-2 pb-3">
        <InfoBanner variant="warning" href="/program" class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-warning">{commonStrings.meal.todayExcluded}</span>
          {#each eliminatedToday as allergenId}
            {@const cat = getCategoryConfig(allergenId)}
            {#if cat}
              <span class="text-sm">{cat.icon}</span>
            {/if}
          {/each}
          <span class="text-xs text-warning">
            {eliminatedToday.map(s => getCategoryConfig(s)?.name).filter(Boolean).join(', ')}
          </span>
          <span class="ml-auto text-xs text-warning/70">Program →</span>
        </InfoBanner>
      </div>
    {/if}
    {/if}
  </div>

  <div class="px-4 pt-4 space-y-5">

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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div role="presentation" onclick={handleGridContainerClick}>

        <!-- Confirmed foods summary (editable working list) -->
        {#if hasConfirmed || gridEditingFoodId}
          <div class="mb-5">
            <p class="micro-label mb-2">{commonStrings.meal.confirmedFoodsLabel}</p>
            <div class="space-y-1.5">
              {#each gridListFoods() as food (food.foodId)}
                {@const fam = workingMeal.families.find(f => f.foods.some(fd => fd.foodId === food.foodId))}
                {@const familyId = fam?.familyId}
                {@const isEditing = food.state.status === 'editing'}
                {@const isConfirmedLike = food.state.status === 'confirmed' || (food.state.status === 'locked' && food.state.prior === 'confirmed')}
                {@const isEliminated = eliminatedFoodIds.has(food.foodId)}
                {@const gridDataState = isEliminated && isConfirmedLike ? 'danger-confirmed'
                  : isEliminated && isEditing ? 'danger'
                  : isConfirmedLike ? 'confirmed'
                  : undefined}
                <div data-food-token data-state={gridDataState}
                  class="rounded-xl overflow-hidden border
                    {isEliminated && isConfirmedLike
                      ? 'bg-danger border-danger'
                      : isEliminated && isEditing
                        ? 'bg-danger/05 border-danger'
                        : 'bg-white border-surface-dark'}">
                  <div class="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      class="text-sm flex-1 text-left
                        {isConfirmedLike
                          ? isEliminated ? 'text-white font-semibold' : 'text-text'
                          : isEliminated ? 'text-danger font-medium' : 'text-text'}"
                      onclick={() => familyId && handleGridRowTap(food.foodId, food.name, familyId)}
                    >{food.name}</button>
                    {#if isConfirmedLike}
                      {@const amount = food.state.status === 'confirmed' ? food.state.amount : food.cachedAmount ?? ''}
                      <span class="text-xs {isEliminated ? 'text-white' : 'text-text-muted'}">{amount}</span>
                    {/if}
                    <button
                      type="button"
                      aria-label="Odebrat {food.name}"
                      class="ml-1 text-text-muted hover:text-danger text-base leading-none"
                      onclick={() => familyId && handleGridRowRemove(food.foodId, familyId)}
                    >×</button>
                  </div>
                  {#if isEditing && food.state.status === 'editing'}
                    {#if isEliminated}
                      <p class="px-3 pb-1 text-xs text-danger font-medium">{commonStrings.meal.eliminatedTodayWarning}</p>
                    {/if}
                    <div class="px-3 pb-3">
                      <FoodEditor
                        amount={food.state.amount}
                        preparation={food.state.preparation}
                        eliminatedVariant={isEliminated}
                        onAmountChange={(a) => familyId && handleGridRowAmountChange(food.foodId, familyId, a)}
                        onPreparationChange={(p) => familyId && handleGridRowPreparationChange(food.foodId, familyId, p)}
                      />
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <p class="micro-label mb-2">{commonStrings.meal.allCategoriesLabel}</p>
        <FamilyGrid
          onSelect={handleFamilySelect}
          {activeFamilyIds}
          {eliminatedFamilyIds}
        />

        <!-- Meal notes -->
        <div class="mt-5">
          <label class="field-label block mb-1" for="meal-notes">
            {commonStrings.meal.mealNotesLabel}
          </label>
          <textarea
            id="meal-notes"
            rows={2}
            bind:value={mealNotes}
            placeholder={commonStrings.meal.notesPlaceholder}
            class="input-base w-full px-4 py-2.5 bg-white resize-none"
          ></textarea>
        </div>
        </div>
      {/if}
    </div>

  </div>
</div>

<!-- Sticky CTA -->
<div
  class="fixed left-0 right-0 bottom-0 z-30 px-4 pt-2 bg-gradient-to-t from-surface via-surface to-transparent"
  style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
>
  <div class="max-w-lg mx-auto">
    <button
      aria-disabled={!drilledFamily && !gridEditingFoodId && !hasConfirmed ? 'true' : 'false'}
      onclick={handleCta}
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {!drilledFamily && !gridEditingFoodId && !hasConfirmed
          ? 'bg-surface-dark text-text-muted cursor-default'
          : editingFoodIsEliminated || familySaveHasEliminated || (hasConflicts && !drilledFamily && !gridEditingFoodId)
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
    onClose={() => { saveErrorMessage = null; }}
  />
{/if}
