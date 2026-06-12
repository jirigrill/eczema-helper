<script lang="ts">
  import type { Meal, MealType, PortionKind, PreparationMethod } from '$lib/domain/models';
  import { detectConflicts } from '$lib/domain/schedule-queries';
  import { ALLERGENS, FOODS, FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
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
  import Chip from '$lib/components/Chip.svelte';
  import FamilyGrid from '$lib/components/FamilyGrid.svelte';
  import FamilyDrillIn from '$lib/components/FamilyDrillIn.svelte';

  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { mealSession } from '$lib/stores/meal-session';
  import { harvestCandidateSession } from '$lib/stores/harvest-candidate-session';

  import {
    emptyWorkingMeal,
    startEditing,
    confirmFood,
    cancelEditing,
    deselectFood,
    updateEditingAmount,
    updateEditingPreparation,
    commitFamily,
    allConfirmedFoods,
    editingFood as getEditingFood,
    foodsForFamily,
    toMealItems,
  } from '$lib/domain/working-meal';
  import type { WorkingMeal } from '$lib/domain/working-meal';

  // ── Schedule context ──────────────────────────────────────
  const { date: targetDate, returnTo } = $derived(parseDayQuery(page.url));
  const raw = $derived($scheduleRaw);
  const ctx = $derived(
    raw.status === 'ready'
      ? buildScheduleContext({ schedule: raw.schedule, answers: raw.answers }, targetDate)
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

  // ── Working meal state ────────────────────────────────────
  let workingMeal = $state<WorkingMeal>(emptyWorkingMeal());
  let mealNotes = $state('');

  // ── View state ────────────────────────────────────────────
  let drilledFamily = $state<FamilyId | null>(null);

  // ── Derived working-meal helpers ──────────────────────────
  const confirmedFoods = $derived(allConfirmedFoods(workingMeal));
  const hasConfirmed = $derived(confirmedFoods.length > 0);

  const currentEditingFood = $derived(
    drilledFamily ? getEditingFood(workingMeal, drilledFamily) : null
  );

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
        // Confirm the editing food
        workingMeal = confirmFood(workingMeal, drilledFamily, currentEditingFood.foodId);
      } else {
        // Commit the family → return to grid
        workingMeal = commitFamily(workingMeal, drilledFamily);
        drilledFamily = null;
      }
    } else {
      // Hotovo: persist
      void saveMeal();
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
    await mealSession.save(meal);
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
      goto(returnTo);
    }
  }

  function handleFamilySelect(familyId: FamilyId): void {
    drilledFamily = familyId;
  }

  function handleCancelEdit(): void {
    if (!drilledFamily) return;
    const editing = getEditingFood(workingMeal, drilledFamily);
    if (editing) {
      workingMeal = cancelEditing(workingMeal, drilledFamily, editing.foodId);
    }
  }

  // ── Conflict detection ────────────────────────────────────
  const conflicts = $derived(detectConflicts(confirmedFoods.map(f => ({
    id: f.foodId,
    name: f.name,
    foodId: f.foodId as import('$lib/domain/models').MealItem['foodId'],
    amount: (f.state.status === 'confirmed' ? f.state.amount : 'portion') as PortionKind,
  })), eliminatedToday));
  const hasConflicts = $derived(conflicts.length > 0);

  // ── Toast ─────────────────────────────────────────────────
  let conflictToastMessage = $state<string | null>(null);
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
    <div class="flex gap-1.5 px-4 pb-3">
      {#each mealTypes as type}
        <Chip active={selectedMealType === type} onclick={() => (selectedMealType = type)} class="flex-1">
          {mealConfig[type].label}
        </Chip>
      {/each}
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
        />
      {:else}
        <p class="micro-label mb-2">{commonStrings.meal.allCategoriesLabel}</p>
        <FamilyGrid
          onSelect={handleFamilySelect}
          {activeFamilyIds}
          {eliminatedFamilyIds}
        />

        <!-- Confirmed foods summary -->
        {#if hasConfirmed}
          <div class="mt-5">
            <p class="micro-label mb-2">{commonStrings.meal.confirmedFoodsLabel}</p>
            <div class="space-y-1.5">
              {#each confirmedFoods as food (food.foodId)}
                <div class="flex items-center gap-2 bg-white border border-surface-dark rounded-xl px-3 py-2">
                  <span class="text-sm text-text">{food.name}</span>
                  {#if food.state.status === 'confirmed'}
                    <span class="text-xs text-text-muted ml-auto">{food.state.amount}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

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
      aria-disabled={!drilledFamily && !hasConfirmed ? 'true' : 'false'}
      onclick={handleCta}
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {!drilledFamily && !hasConfirmed
          ? 'bg-surface-dark text-text-muted cursor-default'
          : hasConflicts && !drilledFamily
            ? 'bg-warning text-white'
            : 'bg-primary text-white'}"
    >
      {ctaLabel()}
    </button>
  </div>
</div>

{#if conflictToastMessage}
  <Toast
    message={conflictToastMessage}
    type="warning"
    onClose={() => { conflictToastMessage = null; }}
  />
{/if}
