<script lang="ts">
  import { FOODS, FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import { foodStrings } from '$lib/strings/families';
  import { getCategoryConfig } from '$lib/config/categories';
  import { familyStrings } from '$lib/strings/families';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import type { FamilyId, CatalogFoodId } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { AllergenId } from '$lib/domain/models';

  let {
    familyId,
    inMealFoodIds = [],
    eliminatedAllergenIds = [],
    customFoods = [],
    onAddFood,
    onBack,
  }: {
    familyId: FamilyId;
    inMealFoodIds?: string[];
    eliminatedAllergenIds?: string[];
    /** Previously-typed custom foods to surface for re-logging (Vlastní family). */
    customFoods?: { foodId: string; name: string }[];
    onAddFood: (foodId: string, name: string) => void;
    onBack: () => void;
  } = $props();

  // All foods in this family
  const familyFoods = $derived(FOODS.filter(f => f.familyId === familyId));

  // Allergens that have at least one food in this family
  const familyAllergenIds = $derived(
    [...new Set(familyFoods.flatMap(f => f.allergenIds as string[]))]
  );

  // Loose foods: no allergenId
  const looseFoods = $derived(familyFoods.filter(f => f.allergenIds.length === 0));

  // Nothing to show at all — only happens for the custom (Vlastní) family
  // before any custom food has been typed.
  const isEmpty = $derived(familyFoods.length === 0 && customFoods.length === 0);

  function nameFor(foodId: string): string {
    return (foodStrings as Record<string, { name: string }>)[foodId]?.name ?? foodId;
  }

  function stateFor(foodId: string, allergenId?: string): 'success' | 'danger' | undefined {
    if (inMealFoodIds.includes(foodId)) return 'success';
    if (allergenId && eliminatedAllergenIds.includes(allergenId)) return 'danger';
    return undefined;
  }
</script>

<div class="space-y-4">
  <!-- Header row -->
  <div class="flex items-center gap-3 px-4 pt-3">
    <button
      type="button"
      aria-label="Zpět"
      class="text-text-muted text-sm px-1 py-1"
      onclick={onBack}
    >←</button>
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <span class="text-xl">{FAMILIES.find(f => f.id === familyId)?.icon ?? ''}</span>
      <span class="text-sm font-semibold text-text">{familyStrings[familyId].name}</span>
    </div>
  </div>

  <!-- Allergen groups -->
  {#each familyAllergenIds as allergenId}
    {@const cfg = getCategoryConfig(allergenId)}
    {@const groupFoods = familyFoods.filter(f => (f.allergenIds as string[]).includes(allergenId))}
    <div class="px-4 space-y-2">
      <!-- Group header -->
      <div class="flex items-center gap-1.5">
        <span class="text-base">{cfg?.icon ?? ''}</span>
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{cfg?.name ?? allergenId}</span>
        {#if eliminatedAllergenIds.includes(allergenId)}
          <span class="ml-1 text-[10px] bg-danger text-white rounded-full px-1.5 py-0.5">!</span>
        {/if}
      </div>
      <!-- Foods in group -->
      <div class="flex flex-wrap gap-2">
        {#each groupFoods as food}
          {@const name = nameFor(food.id)}
          {@const state = stateFor(food.id, allergenId)}
          <button
            type="button"
            data-state={state}
            class="py-2 px-3 rounded-xl text-sm transition-all border
              {state === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : state === 'danger'
                  ? 'bg-danger/08 border-danger/30 text-danger'
                  : 'bg-surface border-surface-dark text-text'}"
            onclick={() => onAddFood(food.id, name)}
          >
            {name}
            {#if state === 'danger'}
              <span class="ml-1 text-[10px] opacity-70">{commonStrings.meal.eliminatedChipLabel}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Loose foods (no allergen) -->
  {#if looseFoods.length > 0}
    <div class="px-4 space-y-2">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">bez alergenu</span>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each looseFoods as food}
          {@const name = nameFor(food.id)}
          {@const state = stateFor(food.id)}
          <button
            type="button"
            data-state={state}
            class="py-2 px-3 rounded-xl text-sm transition-all border
              {state === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-surface border-surface-dark text-text'}"
            onclick={() => onAddFood(food.id, name)}
          >
            {name}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Previously-typed custom foods (Vlastní family) -->
  {#if customFoods.length > 0}
    <div class="px-4 space-y-2">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.meal.customFoodsLabel}</span>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each customFoods as food (food.foodId)}
          {@const state = stateFor(food.foodId)}
          <button
            type="button"
            data-state={state}
            class="py-2 px-3 rounded-xl text-sm transition-all border
              {state === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-surface border-surface-dark text-text'}"
            onclick={() => onAddFood(food.foodId, food.name)}
          >
            {food.name}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty state — custom family with nothing typed yet -->
  {#if isEmpty}
    <div class="px-4">
      <div class="border border-dashed border-surface-dark rounded-xl px-4 py-5 text-center">
        <p class="text-xs text-text-muted">{commonStrings.meal.customFamilyEmptyHint}</p>
      </div>
    </div>
  {/if}
</div>
