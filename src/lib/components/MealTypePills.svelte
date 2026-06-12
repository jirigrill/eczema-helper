<script lang="ts">
  import type { MealType } from '$lib/domain/models';
  import { mealConfig } from '$lib/config/meals';
  import Chip from './Chip.svelte';

  let {
    currentType,
    occupiedTypes,
    isWorkingListNonEmpty,
    onLoad,
    onMove,
    onSwitchAway,
    class: extraClass = '',
  }: {
    currentType: MealType;
    /** Meal types that already have a finalized (persisted) meal for the day. */
    occupiedTypes: MealType[];
    isWorkingListNonEmpty: boolean;
    onLoad: (type: MealType) => void;
    onMove: (type: MealType) => void;
    onSwitchAway: (type: MealType) => void;
    class?: string;
  } = $props();

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  function chipVariant(type: MealType): 'current' | 'default' {
    if (type === currentType) return 'current';
    return 'default';
  }

  function isOccupied(type: MealType): boolean {
    return occupiedTypes.includes(type);
  }

  function handleTap(type: MealType): void {
    if (!isWorkingListNonEmpty) {
      onLoad(type);
      return;
    }

    // Working list is non-empty:
    // re-tap current → no-op (already on this slot, foods are the working list)
    if (type === currentType) return;

    // occupied target → SWITCH-AWAY (guarded by discard/undo from #247)
    // empty target    → MOVE (relabel, no prompt)
    if (isOccupied(type)) {
      onSwitchAway(type);
    } else {
      onMove(type);
    }
  }
</script>

<div class="flex gap-1.5 {extraClass}">
  {#each mealTypes as type (type)}
    <Chip
      active={isOccupied(type) && type !== currentType}
      variant={chipVariant(type)}
      onclick={() => handleTap(type)}
      class="flex-1"
    >
      {mealConfig[type].label}
    </Chip>
  {/each}
</div>
