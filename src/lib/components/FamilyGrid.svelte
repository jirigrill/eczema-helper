<script lang="ts">
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import { familyStrings } from '$lib/strings/families';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

  let {
    onSelect,
  }: {
    onSelect: (familyId: FamilyId) => void;
  } = $props();
</script>

<div class="grid grid-cols-4 gap-2">
  {#each FAMILIES as family (family.id)}
    <button
      type="button"
      class="flex flex-col items-center justify-center gap-1 h-[72px] px-1 rounded-xl text-xs font-medium transition-all relative border bg-white border-surface-dark text-text"
      onclick={() => onSelect(family.id)}
    >
      <span class="text-2xl leading-none">{family.icon}</span>
      <span class="leading-tight text-center">{familyStrings[family.id].name}</span>
    </button>
  {/each}
</div>
