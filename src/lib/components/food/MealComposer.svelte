<script lang="ts">
  import type { FoodSubItem, MealItem } from '$lib/domain/models';
  import { MEAL_TYPE_LABELS, type MealType } from '$lib/domain/services/meal-logging.service';
  import MealItemPicker from './MealItemPicker.svelte';

  let {
    subItems,
    initialMealType,
    initialLabel,
    initialItems,
    onSave,
    onCancel,
  }: {
    subItems: FoodSubItem[];
    initialMealType?: MealType;
    initialLabel?: string;
    initialItems?: MealItem[];
    onSave: (data: { mealType: MealType; label?: string; items: Partial<MealItem>[] }) => void;
    onCancel: () => void;
  } = $props();

  let selectedMealType = $state<MealType>(initialMealType ?? 'lunch');
  let label = $state(initialLabel ?? '');
  let selectedItems = $state<Partial<MealItem>[]>(initialItems ?? []);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  function handleAddItem(item: Partial<MealItem>) {
    selectedItems = [...selectedItems, item];
  }

  function handleRemoveItem(index: number) {
    selectedItems = selectedItems.filter((_, i) => i !== index);
  }

  function handleSave() {
    if (selectedItems.length === 0) return;
    onSave({
      mealType: selectedMealType,
      label: label.trim() || undefined,
      items: selectedItems,
    });
  }

  const canSave = $derived(selectedItems.length > 0);
</script>

<div class="space-y-4">
  <!-- Meal type selector -->
  <div>
    <label class="block text-sm font-medium text-text-muted mb-2">Typ jídla</label>
    <div class="grid grid-cols-4 gap-2">
      {#each mealTypes as type}
        <button
          type="button"
          class="
            py-2 px-3 rounded-lg text-sm font-medium
            transition-colors
            {selectedMealType === type
              ? 'bg-primary text-white'
              : 'bg-surface text-text hover:bg-surface-dark'}
          "
          onclick={() => (selectedMealType = type)}
        >
          {MEAL_TYPE_LABELS[type]}
        </button>
      {/each}
    </div>
  </div>

  <!-- Optional label -->
  <div>
    <label class="block text-sm font-medium text-text-muted mb-2" for="meal-label">
      Poznámka (volitelné)
    </label>
    <input
      id="meal-label"
      type="text"
      bind:value={label}
      placeholder="např. u babičky"
      class="
        w-full rounded-lg border border-surface-dark
        px-3 py-2 text-sm
        focus:outline-none focus:ring-2 focus:ring-primary/50
      "
    />
  </div>

  <!-- Food item picker -->
  <div>
    <label class="block text-sm font-medium text-text-muted mb-2">Položky jídla</label>
    <MealItemPicker
      {subItems}
      selectedItems={selectedItems as MealItem[]}
      onAdd={handleAddItem}
      onRemove={handleRemoveItem}
    />
  </div>

  <!-- Actions -->
  <div class="flex gap-3 pt-2">
    <button
      type="button"
      class="flex-1 py-2 px-4 rounded-lg bg-surface text-text hover:bg-surface-dark"
      onclick={onCancel}
    >
      Zrušit
    </button>
    <button
      type="button"
      class="
        flex-1 py-2 px-4 rounded-lg font-medium
        {canSave
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-surface text-text-muted cursor-not-allowed'}
      "
      onclick={handleSave}
      disabled={!canSave}
    >
      Uložit
    </button>
  </div>
</div>
