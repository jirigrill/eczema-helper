<script lang="ts">
  import type { Meal } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import DayCard from './DayCard.svelte';

  let {
    date: _date,
    meals,
    eliminatedToday,
  }: {
    date: string;
    meals: Meal[];
    eliminatedToday: string[];
  } = $props();

  // `date` is intentionally unused here — meals are pre-filtered by the caller
  // and the launcher (FAB submenu) lives outside this card. Kept in the props
  // contract for the day-page integration test and future tap-to-edit (#265).

  const catalog = new BundledCatalogAdapter();
  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  const mealsSorted = $derived(
    mealTypeOrder
      .map((type) => meals.find((m) => m.mealType === type))
      .filter((m): m is Meal => m !== undefined)
  );

</script>

<DayCard label={commonStrings.today.mealsLabel}>
  {#if mealsSorted.length === 0}
    <p class="body-muted">{commonStrings.today.mealsEmpty}</p>
  {:else}
    <div class="space-y-3">
      {#each mealsSorted as meal (meal.id)}
        {@const cfg = mealConfig[meal.mealType]}
        {@const Icon = cfg.icon}
        <a
          data-testid="meal-row-{meal.mealType}"
          href="/meal?type={meal.mealType}&date={meal.date}&returnTo=/day/{meal.date}"
          class="block"
        >
          <div class="flex items-center gap-1.5 mb-1">
            <Icon class="w-4 h-4 text-text" />
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
                <span class="text-text-muted">
                  {portionStrings[item.amount].label}{#if item.preparationMethod} · {preparationStrings[item.preparationMethod].label}{/if}
                </span>
              </span>
            {/each}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</DayCard>
