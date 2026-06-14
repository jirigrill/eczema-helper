<script lang="ts">
  import type { Meal } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { actionStrings } from '$lib/strings/actions';
  import { mealConfig } from '$lib/config/meals';
  import { portionStrings } from '$lib/strings/portions';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import DayCard from './DayCard.svelte';

  let {
    date,
    meals,
    eliminatedToday,
  }: {
    date: string;
    meals: Meal[];
    eliminatedToday: string[];
  } = $props();

  const catalog = new BundledCatalogAdapter();
  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  const mealsSorted = $derived(
    mealTypeOrder
      .map((type) => meals.find((m) => m.mealType === type))
      .filter((m): m is Meal => m !== undefined)
  );

</script>

{#snippet addLink()}
  <a
    href="/meal?date={date}&returnTo=/day/{date}"
    class="text-primary text-xs font-medium">+ {actionStrings.add}</a>
{/snippet}

<DayCard label={commonStrings.today.mealsLabel} right={addLink}>
  {#if mealsSorted.length === 0}
    <p class="body-muted">{commonStrings.today.mealsEmpty}</p>
  {:else}
    <div class="space-y-3">
      {#each mealsSorted as meal (meal.id)}
        {@const cfg = mealConfig[meal.mealType]}
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-base leading-none">{cfg.icon}</span>
            <span class="text-[12px] font-semibold text-text">{cfg.label}</span>
          </div>
          <div class="flex flex-wrap gap-1">
            {#each meal.items as item}
              {@const triggers = catalog.allergensForFood(item.foodId)}
              {@const isConflict = triggers.some(t => eliminatedToday.includes(t))}
              <span
                data-conflict={isConflict ? 'true' : undefined}
                class="text-xs rounded-full px-2 py-0.5 {isConflict
                  ? 'bg-warning/10 text-warning'
                  : 'bg-surface text-text'}"
              >
                {item.name}
                <span class="text-text-muted"> {portionStrings[item.amount].short}</span>
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</DayCard>
