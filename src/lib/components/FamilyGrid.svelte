<script lang="ts">
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import { familyStrings } from '$lib/strings/families';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

  let {
    onSelect,
    activeFamilyIds = [],
    eliminatedFamilyIds = [],
  }: {
    onSelect: (familyId: FamilyId) => void;
    activeFamilyIds?: FamilyId[];
    eliminatedFamilyIds?: FamilyId[];
  } = $props();

  function stateFor(id: FamilyId): 'active' | 'danger' | undefined {
    if (activeFamilyIds.includes(id)) return 'active';
    if (eliminatedFamilyIds.includes(id)) return 'danger';
    return undefined;
  }
</script>

<div class="grid grid-cols-4 gap-2">
  {#each FAMILIES as family (family.id)}
    {@const state = stateFor(family.id)}
    <button
      type="button"
      data-state={state}
      class="flex flex-col items-center justify-center gap-1 h-[72px] px-1 rounded-xl text-xs font-medium transition-all relative border bg-white border-surface-dark text-text"
      onclick={() => onSelect(family.id)}
    >
      <span class="text-2xl leading-none">{family.icon}</span>
      <span class="leading-tight text-center">{familyStrings[family.id].name}</span>
      {#if state === 'danger'}
        <span class="absolute -top-1 -right-1 text-[10px] bg-danger text-white rounded-full w-4 h-4 flex items-center justify-center">!</span>
      {/if}
    </button>
  {/each}
</div>
