<script lang="ts">
  import type { Meal, MealItem, FoodSubItem } from '$lib/domain/models';
  import { sortMealsByType, type MealType } from '$lib/domain/services/meal-logging.service';
  import MealCard from './MealCard.svelte';
  import MealComposer from './MealComposer.svelte';

  type MealWithItems = Meal & { items: MealItem[] };

  let {
    meals,
    subItems,
    onCreateMeal,
    onUpdateMeal,
    onDeleteMeal,
  }: {
    meals: MealWithItems[];
    subItems: FoodSubItem[];
    onCreateMeal: (data: { mealType: MealType; label?: string; items: Partial<MealItem>[] }) => void;
    onUpdateMeal: (id: string, data: { mealType?: MealType; label?: string; items?: Partial<MealItem>[] }) => void;
    onDeleteMeal: (id: string) => void;
  } = $props();

  let showComposer = $state(false);
  let editingMealId = $state<string | null>(null);

  const sortedMeals = $derived(sortMealsByType(meals));
  const editingMeal = $derived(
    editingMealId ? meals.find((m) => m.id === editingMealId) : null
  );

  function handleAddClick() {
    editingMealId = null;
    showComposer = true;
  }

  function handleEditClick(mealId: string) {
    editingMealId = mealId;
    showComposer = true;
  }

  function handleDeleteClick(mealId: string) {
    // TODO: Add confirmation dialog
    onDeleteMeal(mealId);
  }

  function handleSave(data: { mealType: MealType; label?: string; items: Partial<MealItem>[] }) {
    if (editingMealId) {
      onUpdateMeal(editingMealId, data);
    } else {
      onCreateMeal(data);
    }
    showComposer = false;
    editingMealId = null;
  }

  function handleCancel() {
    showComposer = false;
    editingMealId = null;
  }
</script>

<div class="space-y-3">
  {#if showComposer}
    <!-- Meal composer -->
    <div class="bg-surface rounded-xl p-4">
      <h4 class="font-medium text-text mb-3">
        {editingMealId ? 'Upravit jídlo' : 'Přidat jídlo'}
      </h4>
      <MealComposer
        {subItems}
        initialMealType={editingMeal?.mealType as MealType}
        initialLabel={editingMeal?.label}
        initialItems={editingMeal?.items}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  {:else}
    <!-- Meals list -->
    {#if sortedMeals.length > 0}
      <div class="space-y-2">
        {#each sortedMeals as meal (meal.id)}
          <MealCard
            {meal}
            items={meal.items}
            {subItems}
            onEdit={() => handleEditClick(meal.id)}
            onDelete={() => handleDeleteClick(meal.id)}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-text-muted text-center py-4">
        Žádná jídla pro tento den
      </p>
    {/if}

    <!-- Add button -->
    <button
      type="button"
      class="
        w-full flex items-center justify-center gap-2
        py-3 px-4 rounded-lg
        bg-surface text-primary font-medium
        hover:bg-surface-dark
      "
      onclick={handleAddClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Přidat jídlo
    </button>
  {/if}
</div>
