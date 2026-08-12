<script lang="ts">
  import { dev } from '$app/environment';
  import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
  import { foodStrings } from '$lib/strings/families';
  import { familySources, ostatniLabel } from '$lib/strings/family-sources';
  import type { FamilyId, FoodId } from '$lib/data/allergen-catalog/allergen-catalog';
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import type { WorkingFood } from '$lib/domain/working-meal';
  import FoodTile from '$lib/components/FoodTile.svelte';
  import FoodEditor from '$lib/components/FoodEditor.svelte';
  import { preparationsForFood } from '$lib/domain/preparation-rules';

  // FOODS is `as const satisfies readonly FoodRecord[]`, so the inferred union
  // drops `sourceGroup` on the records that omit it; re-add it as optional.
  type CatalogFood = (typeof FOODS)[number] & { sourceGroup?: string };

  let {
    familyId,
    foods,
    onFoodTap,
    onAmountChange,
    onPreparationChange,
    onCancelEdit,
  }: {
    familyId: FamilyId;
    /** Current working-meal state for this family's foods. */
    foods: WorkingFood[];
    onFoodTap: (foodId: FoodId, name: string) => void;
    onAmountChange: (foodId: FoodId, amount: PortionKind) => void;
    onPreparationChange: (foodId: FoodId, prep: PreparationMethod | undefined) => void;
    /** Called when the user clicks outside any FoodTile while one is editing. */
    onCancelEdit?: () => void;
  } = $props();

  const catalogFoods: CatalogFood[] = $derived(FOODS.filter((f) => f.familyId === familyId));
  const sources = $derived(
    (familySources as Partial<Record<FamilyId, readonly { key: string; label: string }[]>>)[
      familyId
    ],
  );
  const grouped = $derived(catalogFoods.length >= 5 && sources != null);

  /** Czech-locale comparator on resolved Czech name (fallback to id when missing). */
  function compareByName(a: CatalogFood, b: CatalogFood): number {
    return nameFor(a.id).localeCompare(nameFor(b.id), 'cs');
  }

  /** Foods rendered in flat mode — alphabetical by Czech name. */
  const sortedCatalogFoods = $derived([...catalogFoods].sort(compareByName));

  type RenderGroup = {
    key: string;
    label: string;
    foods: readonly CatalogFood[];
  };

  const renderGroups = $derived.by<RenderGroup[]>(() => {
    if (!grouped || !sources) return [];
    const authored = sources.map((s) => ({
      key: s.key,
      label: s.label,
      foods: catalogFoods.filter((f) => f.sourceGroup === s.key).sort(compareByName),
    }));
    const authoredKeys = new Set(authored.map((g) => g.key));
    const ostatni = catalogFoods
      .filter((f) => f.sourceGroup === undefined || !authoredKeys.has(f.sourceGroup))
      .sort(compareByName);
    // Authored source groups keep their curated order.
    const result: RenderGroup[] = authored.filter((g) => g.foods.length > 0);
    if (ostatni.length > 0) {
      result.push({ key: '__ostatni__', label: ostatniLabel, foods: ostatni });
    }
    return result;
  });

  $effect(() => {
    if (!dev || !grouped) return;
    const ostatni = renderGroups.find((g) => g.key === '__ostatni__');
    if (!ostatni) return;
    const maxAuthored = Math.max(
      0,
      ...renderGroups.filter((g) => g.key !== '__ostatni__').map((g) => g.foods.length),
    );
    if (ostatni.foods.length > maxAuthored) {
      console.warn(
        `[FamilyDrillIn] family "${familyId}" has Ostatní (${ostatni.foods.length}) ` +
          `larger than its largest authored source group (${maxAuthored}). ` +
          'Consider adding another sourceGroup or tagging foods.',
      );
    }
  });

  function nameFor(foodId: string): string {
    return (foodStrings as Record<string, { name: string }>)[foodId]?.name ?? foodId;
  }

  function workingFoodFor(foodId: string): WorkingFood | undefined {
    return foods.find((f) => f.foodId === foodId);
  }

  /** Whether any food in the working-meal state is currently editing. */
  const hasActiveEditor = $derived(foods.some((f) => f.state.status === 'editing'));

  function stateFor(foodId: string): WorkingFood['state'] {
    const wf = workingFoodFor(foodId);
    if (wf) return wf.state;
    if (hasActiveEditor) return { status: 'locked', prior: 'idle' };
    return { status: 'idle' };
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
      <div class="space-y-2 px-4">
        <span class="text-text-muted text-xs font-semibold tracking-wide uppercase"
          >{group.label}</span
        >
        <div class="flex flex-col gap-2">
          {#each group.foods as food (food.id)}
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
                      preparations={preparationsForFood(food.id)}
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
    <div class="space-y-2 px-4">
      <div class="flex flex-col gap-2">
        {#each sortedCatalogFoods as food (food.id)}
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
                    preparations={preparationsForFood(food.id)}
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
</div>
