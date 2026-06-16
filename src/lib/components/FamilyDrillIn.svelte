<script lang="ts">
  import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
  import { foodStrings } from '$lib/strings/families';
  import { getCategoryConfig } from '$lib/config/categories';
  import { commonStrings } from '$lib/strings/common';
  import { actionStrings } from '$lib/strings/actions';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import type { WorkingFood } from '$lib/domain/working-meal';
  import FoodTile from '$lib/components/FoodTile.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';

  let {
    familyId,
    foods,
    eliminatedAllergenIds = [],
    onFoodTap,
    onAmountChange,
    onPreparationChange,
    onCancelEdit,
    onNewCustomFood,
    customFoods = [],
  }: {
    familyId: FamilyId;
    /** Current working-meal state for this family's foods. */
    foods: WorkingFood[];
    eliminatedAllergenIds?: string[];
    onFoodTap: (foodId: string, name: string) => void;
    onAmountChange: (foodId: string, amount: PortionKind) => void;
    onPreparationChange: (foodId: string, prep: PreparationMethod | undefined) => void;
    /** Called when the user clicks outside any FoodTile while one is editing. */
    onCancelEdit?: () => void;
    /** Called when the user submits a new custom food name (Vlastní family only). */
    onNewCustomFood?: (name: string) => void;
    customFoods?: { foodId: string; name: string }[];
  } = $props();

  let customInputValue = $state('');

  function handleAddCustomFood(): void {
    const trimmed = customInputValue.trim();
    if (!trimmed || !onNewCustomFood) return;
    onNewCustomFood(trimmed);
    customInputValue = '';
  }

  const catalogFoods = $derived(FOODS.filter(f => f.familyId === familyId));
  const familyAllergenIds = $derived(
    [...new Set(catalogFoods.flatMap(f => f.allergenIds as string[]))]
  );
  const looseFoods = $derived(catalogFoods.filter(f => f.allergenIds.length === 0));
  const isEmpty = $derived(catalogFoods.length === 0 && customFoods.length === 0);

  function nameFor(foodId: string): string {
    return (foodStrings as Record<string, { name: string }>)[foodId]?.name ?? foodId;
  }

  function workingFoodFor(foodId: string): WorkingFood | undefined {
    return foods.find(f => f.foodId === foodId);
  }

  /** Whether any food in the working-meal state is currently editing. */
  const hasActiveEditor = $derived(foods.some(f => f.state.status === 'editing'));

  function stateFor(foodId: string): WorkingFood['state'] {
    const wf = workingFoodFor(foodId);
    if (wf) return wf.state;
    // Food not yet in working meal: lock it if another food is editing
    if (hasActiveEditor) return { status: 'locked', prior: 'idle' };
    return { status: 'idle' };
  }

  function eliminatedFor(foodId: string, allergenId?: string): 'danger' | undefined {
    if (allergenId && eliminatedAllergenIds.includes(allergenId)) return 'danger';
    return undefined;
  }

  function handleContainerClick(e: MouseEvent): void {
    if (!hasActiveEditor || !onCancelEdit) return;
    // Cancel if the click didn't land inside a food-tile element
    if (!(e.target as Element).closest('[data-food-tile]')) {
      onCancelEdit();
    }
  }
</script>

<div class="space-y-4" onclick={handleContainerClick} role="presentation">
  <!-- Allergen groups -->
  {#each familyAllergenIds as allergenId}
    {@const cfg = getCategoryConfig(allergenId)}
    {@const groupFoods = catalogFoods.filter(f => (f.allergenIds as string[]).includes(allergenId))}
    <div class="px-4 space-y-2">
      <div class="flex items-center gap-1.5">
        <span class="text-base">{cfg?.icon ?? ''}</span>
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{cfg?.name ?? allergenId}</span>
        {#if eliminatedAllergenIds.includes(allergenId)}
          <span class="ml-1 text-[10px] bg-danger text-white rounded-full px-1.5 py-0.5">!</span>
        {/if}
      </div>
      <div class="flex flex-col gap-2">
        {#each groupFoods as food}
          {@const name = nameFor(food.id)}
          {@const st = stateFor(food.id)}
          <div data-food-tile>
          <FoodTile
            {name}
            state={st.status}
            eliminatedStatus={eliminatedFor(food.id, allergenId)}
            lockedPrior={st.status === 'locked' ? st.prior : undefined}
            onclick={() => onFoodTap(food.id, name)}
          >
            {#snippet editor()}
              {#if st.status === 'editing'}
                <FoodEditor
                  amount={st.amount}
                  preparation={st.preparation}
                  eliminatedVariant={eliminatedFor(food.id, allergenId) === 'danger'}
                  onAmountChange={(a) => onAmountChange(food.id, a)}
                  onPreparationChange={(p) => onPreparationChange(food.id, p)}
                />
              {/if}
            {/snippet}
          </FoodTile>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Loose foods (no allergen) -->
  {#if looseFoods.length > 0}
    <div class="px-4 space-y-2">
      <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">bez alergenu</span>
      <div class="flex flex-col gap-2">
        {#each looseFoods as food}
          {@const name = nameFor(food.id)}
          {@const st = stateFor(food.id)}
          <div data-food-tile>
          <FoodTile
            {name}
            state={st.status}
            lockedPrior={st.status === 'locked' ? st.prior : undefined}
            onclick={() => onFoodTap(food.id, name)}
          >
            {#snippet editor()}
              {#if st.status === 'editing'}
                <FoodEditor
                  amount={st.amount}
                  preparation={st.preparation}
                  onAmountChange={(a) => onAmountChange(food.id, a)}
                  onPreparationChange={(p) => onPreparationChange(food.id, p)}
                />
              {/if}
            {/snippet}
          </FoodTile>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Previously-typed custom foods (Vlastní family) -->
  {#if familyId === 'custom'}
    <div class="px-4 space-y-2">
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={customInputValue}
          placeholder={commonStrings.meal.customFoodPlaceholder}
          class="input-base flex-1 px-3 py-2 bg-white text-sm"
        />
        <button
          type="button"
          disabled={customInputValue.trim().length === 0}
          onclick={handleAddCustomFood}
          class="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white disabled:bg-surface-dark disabled:text-text-muted"
        >{actionStrings.add}</button>
      </div>
    </div>
  {/if}

  {#if customFoods.length > 0}
    <div class="px-4 space-y-2">
      <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.meal.customFoodsLabel}</span>
      <div class="flex flex-col gap-2">
        {#each customFoods as food (food.foodId)}
          {@const st = stateFor(food.foodId)}
          <div data-food-tile>
          <FoodTile
            name={food.name}
            state={st.status}
            lockedPrior={st.status === 'locked' ? st.prior : undefined}
            onclick={() => onFoodTap(food.foodId, food.name)}
          >
            {#snippet editor()}
              {#if st.status === 'editing'}
                <FoodEditor
                  amount={st.amount}
                  preparation={st.preparation}
                  onAmountChange={(a) => onAmountChange(food.foodId, a)}
                  onPreparationChange={(p) => onPreparationChange(food.foodId, p)}
                />
              {/if}
            {/snippet}
          </FoodTile>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if isEmpty}
    <div class="px-4">
      <div class="border border-dashed border-surface-dark rounded-xl px-4 py-5 text-center">
        <p class="text-xs text-text-muted">{commonStrings.meal.customFamilyEmptyHint}</p>
      </div>
    </div>
  {/if}
</div>
