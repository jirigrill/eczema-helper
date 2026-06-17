<script lang="ts">
  import { dev } from '$app/environment';
  import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
  import { foodStrings } from '$lib/strings/families';
  import { familySources, ostatniLabel } from '$lib/strings/family-sources';
  import { commonStrings } from '$lib/strings/common';
  import { actionStrings } from '$lib/strings/actions';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import type { WorkingFood } from '$lib/domain/working-meal';
  import FoodTile from '$lib/components/FoodTile.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';

  type CatalogFood = (typeof FOODS)[number];

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
  const sources = $derived(
    (familySources as Partial<Record<FamilyId, readonly { key: string; label: string }[]>>)[familyId]
  );
  const grouped = $derived(catalogFoods.length >= 5 && sources != null);

  type RenderGroup = {
    key: string;
    label: string;
    foods: readonly CatalogFood[];
  };

  const renderGroups = $derived.by<RenderGroup[]>(() => {
    if (!grouped || !sources) return [];
    const authored = sources.map(s => ({
      key: s.key,
      label: s.label,
      foods: catalogFoods.filter(f => f.sourceGroup === s.key),
    }));
    const authoredKeys = new Set(authored.map(g => g.key));
    const ostatni = catalogFoods.filter(
      f => f.sourceGroup === undefined || !authoredKeys.has(f.sourceGroup),
    );
    const result: RenderGroup[] = authored.filter(g => g.foods.length > 0);
    if (ostatni.length > 0) {
      result.push({ key: '__ostatni__', label: ostatniLabel, foods: ostatni });
    }
    return result;
  });

  $effect(() => {
    if (!dev || !grouped) return;
    const ostatni = renderGroups.find(g => g.key === '__ostatni__');
    if (!ostatni) return;
    const maxAuthored = Math.max(
      0,
      ...renderGroups.filter(g => g.key !== '__ostatni__').map(g => g.foods.length),
    );
    if (ostatni.foods.length > maxAuthored) {
      // eslint-disable-next-line no-console
      console.warn(
        `[FamilyDrillIn] family "${familyId}" has Ostatní (${ostatni.foods.length}) ` +
          `larger than its largest authored source group (${maxAuthored}). ` +
          'Consider adding another sourceGroup or tagging foods.',
      );
    }
  });

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
    if (hasActiveEditor) return { status: 'locked', prior: 'idle' };
    return { status: 'idle' };
  }

  function eliminatedForFood(food: CatalogFood): 'danger' | undefined {
    if (food.allergenIds.some(a => eliminatedAllergenIds.includes(a))) return 'danger';
    return undefined;
  }

  function handleContainerClick(e: MouseEvent): void {
    if (!hasActiveEditor || !onCancelEdit) return;
    if (!(e.target as Element).closest('[data-food-tile]')) {
      onCancelEdit();
    }
  }
</script>

<div class="space-y-4" onclick={handleContainerClick} role="presentation">
  {#if grouped}
    {#each renderGroups as group (group.key)}
      <div class="px-4 space-y-2">
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{group.label}</span>
        <div class="flex flex-col gap-2">
          {#each group.foods as food (food.id)}
            {@const name = nameFor(food.id)}
            {@const st = stateFor(food.id)}
            {@const danger = eliminatedForFood(food)}
            <div data-food-tile>
              <FoodTile
                {name}
                state={st.status}
                eliminatedStatus={danger}
                lockedPrior={st.status === 'locked' ? st.prior : undefined}
                onclick={() => onFoodTap(food.id, name)}
              >
                {#snippet editor()}
                  {#if st.status === 'editing'}
                    <FoodEditor
                      amount={st.amount}
                      preparation={st.preparation}
                      eliminatedVariant={danger === 'danger'}
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
  {:else if catalogFoods.length > 0}
    <div class="px-4 space-y-2">
      <div class="flex flex-col gap-2">
        {#each catalogFoods as food (food.id)}
          {@const name = nameFor(food.id)}
          {@const st = stateFor(food.id)}
          {@const danger = eliminatedForFood(food)}
          <div data-food-tile>
            <FoodTile
              {name}
              state={st.status}
              eliminatedStatus={danger}
              lockedPrior={st.status === 'locked' ? st.prior : undefined}
              onclick={() => onFoodTap(food.id, name)}
            >
              {#snippet editor()}
                {#if st.status === 'editing'}
                  <FoodEditor
                    amount={st.amount}
                    preparation={st.preparation}
                    eliminatedVariant={danger === 'danger'}
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
