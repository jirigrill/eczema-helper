<script lang="ts">
  import type { Meal, MealItem, FoodSubItem } from '$lib/domain/models';
  import { MEAL_TYPE_LABELS, formatMealItems, type MealType } from '$lib/domain/services/meal-logging.service';

  let {
    meal,
    items,
    subItems,
    onEdit,
    onDelete,
  }: {
    meal: Meal;
    items: MealItem[];
    subItems: FoodSubItem[];
    onEdit?: () => void;
    onDelete?: () => void;
  } = $props();

  const mealTypeLabel = $derived(MEAL_TYPE_LABELS[meal.mealType as MealType]);
  const itemsText = $derived(formatMealItems(items, subItems));
</script>

<div
  class="
    bg-white border border-surface-dark rounded-lg p-3
    hover:border-primary/30 transition-colors
  "
>
  <div class="flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-1">
        <span class="font-medium text-text">{mealTypeLabel}</span>
        {#if meal.label}
          <span class="text-sm text-text-muted">({meal.label})</span>
        {/if}
      </div>

      <!-- Items -->
      <p class="text-sm text-text-muted truncate">{itemsText}</p>
    </div>

    <!-- Actions -->
    {#if onEdit || onDelete}
      <div class="flex-none flex gap-1">
        {#if onEdit}
          <button
            type="button"
            class="p-1.5 text-text-muted hover:text-primary rounded"
            onclick={onEdit}
            aria-label="Upravit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        {/if}
        {#if onDelete}
          <button
            type="button"
            class="p-1.5 text-text-muted hover:text-danger rounded"
            onclick={onDelete}
            aria-label="Smazat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
