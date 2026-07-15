<script lang="ts">
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import { familyStrings } from '$lib/strings/families';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

  let {
    onSelect,
    activeFamilyIds = [],
  }: {
    onSelect: (familyId: FamilyId) => void;
    /**
     * Families that already have a selection. Renders a small primary dot on
     * the tile. Used by the onboarding questionnaire to mark families with a
     * chosen allergen. The meal grid leaves this empty — there the per-food
     * state is shown inside the drill-in, not on the family tile.
     */
    activeFamilyIds?: FamilyId[];
  } = $props();
</script>

<div class="grid grid-cols-4 gap-2">
  {#each FAMILIES as family (family.id)}
    {@const isActive = activeFamilyIds.includes(family.id)}
    <button
      type="button"
      data-state={isActive ? 'active' : undefined}
      class="border-surface-dark text-text relative flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border bg-white px-1 text-xs font-medium transition-all"
      onclick={() => onSelect(family.id)}
    >
      <span class="text-2xl leading-none">{family.icon}</span>
      <span class="text-center leading-tight">{familyStrings[family.id].name}</span>
      {#if isActive}
        <span
          data-testid="active-dot"
          class="bg-primary absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
        ></span>
      {/if}
    </button>
  {/each}
</div>
