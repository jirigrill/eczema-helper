<script lang="ts">
  import type { AllergenId, Meal } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { categoryStrings } from '$lib/strings/categories';
  import { mealConfig } from '$lib/config/meals';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import { detectConflicts } from '$lib/domain/schedule-queries';
  import DayCard from './DayCard.svelte';

  let {
    date,
    meals,
    eliminatedSlugs,
  }: {
    date: string;
    meals: Meal[];
    /** Combined eliminated set for this meal's actor (protocol ∪ that actor's permanent). */
    eliminatedSlugs: AllergenId[];
  } = $props();

  const catalog = new BundledCatalogAdapter();
  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  type SlotEntry = {
    type: (typeof mealTypeOrder)[number];
    meal: Meal | undefined;
  };

  const slots = $derived(
    mealTypeOrder.map((type) => ({
      type,
      meal: meals.find((m) => m.mealType === type),
    })) satisfies SlotEntry[],
  );
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as { type, meal } (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {#if meal}
        {@const conflicts = detectConflicts(meal.items, eliminatedSlugs, catalog)}
        {@const conflictItemIds = new Set(conflicts.map((c) => c.id))}
        {@const conflictAllergens = [
          ...new Set(
            conflicts
              .flatMap((item) => catalog.allergensForFood(item.foodId))
              .filter((a) => eliminatedSlugs.includes(a as AllergenId)),
          ),
        ]}
        {@const isConflict = conflictItemIds.size > 0}
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={meal.date}&returnTo=/day/{meal.date}"
          class="block"
        >
          <div class="flex items-center gap-3 py-2">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {isConflict
                ? 'bg-danger/15 text-danger'
                : 'text-primary bg-white'}"
            >
              <Icon class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-text text-sm font-semibold">{cfg.label}</span>
                {#each conflictAllergens as allergenId}
                  <span
                    class="bg-danger/15 text-danger rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    >⚠ {categoryStrings[allergenId as keyof typeof categoryStrings]?.name ??
                      allergenId}</span
                  >
                {/each}
              </div>
              <div class="text-text-muted truncate text-[11px]">
                {#each meal.items as item, i}
                  {#if i > 0}<span> · </span>{/if}
                  {@const itemConflict = conflictItemIds.has(item.id)}
                  <span
                    class={itemConflict ? 'text-danger font-medium' : ''}
                    data-conflict={itemConflict ? 'true' : undefined}>{item.name}</span
                  >
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
          <div class="flex items-center gap-3 py-2">
            <div
              class="text-text-muted/50 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"
            >
              <Icon class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-text-muted/70 text-sm font-medium">{cfg.label}</div>
            </div>
            <span class="text-primary text-lg leading-none">+</span>
          </div>
        </a>
      {/if}
    {/each}
  </div>
</DayCard>
