<script lang="ts">
  import type { Meal } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { categoryStrings } from '$lib/strings/categories';
  import { mealConfig } from '$lib/config/meals';
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

  type SlotEntry = {
    type: typeof mealTypeOrder[number];
    meal: Meal | undefined;
  };

  const slots = $derived(
    mealTypeOrder.map((type) => ({
      type,
      meal: meals.find((m) => m.mealType === type),
    })) satisfies SlotEntry[]
  );
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-y divide-surface-dark">
    {#each slots as { type, meal } (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {#if meal}
        {@const conflictAllergens = [...new Set(
          meal.items.flatMap((item) => catalog.allergensForFood(item.foodId))
            .filter((a) => eliminatedToday.includes(a))
        )]}
        {@const isConflict = conflictAllergens.length > 0}
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={meal.date}&returnTo=/day/{meal.date}"
          class="block"
        >
          <div class="py-2 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 {isConflict ? 'bg-danger/15 text-danger' : 'bg-white text-primary'}">
              <Icon class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-semibold text-text">{cfg.label}</span>
                {#each conflictAllergens as allergenId}
                  <span class="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-danger/15 text-danger">⚠ {categoryStrings[allergenId]?.name ?? allergenId}</span>
                {/each}
              </div>
              <div class="text-[11px] text-text-muted truncate">
                {#each meal.items as item, i}
                  {#if i > 0}<span> · </span>{/if}
                  {@const triggers = catalog.allergensForFood(item.foodId)}
                  {@const itemConflict = triggers.some((t) => eliminatedToday.includes(t))}
                  <span class={itemConflict ? 'text-danger font-medium' : ''}
                    data-conflict={itemConflict ? 'true' : undefined}>{item.name}</span>
                {/each}
              </div>
            </div>
            <span class="text-text-muted text-sm">›</span>
          </div>
        </a>
      {:else}
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={date}&returnTo=/day/{date}"
          class="block"
        >
          <div class="py-2 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-white text-text-muted/50 flex items-center justify-center shrink-0">
              <Icon class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-text-muted/70">{cfg.label}</div>
            </div>
            <span class="text-primary text-lg leading-none">+</span>
          </div>
        </a>
      {/if}
    {/each}
  </div>
</DayCard>
