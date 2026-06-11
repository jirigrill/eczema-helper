<script lang="ts">
  import { FAMILIES } from '$lib/data/allergen-catalog/allergen-catalog';
  import { allergensByFamily } from '$lib/data/allergen-catalog';
  import { getCategoryConfig } from '$lib/config/categories';
  import { familyStrings } from '$lib/strings/families';
  import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

  let {
    familyId,
    selected = $bindable<string[]>([]),
    variant = 'primary',
    onBack,
  }: {
    familyId: FamilyId;
    selected?: string[];
    variant?: 'primary' | 'danger';
    onBack: () => void;
  } = $props();

  const allergens = $derived(allergensByFamily(familyId));

  function toggle(allergenId: string) {
    if (selected.includes(allergenId)) {
      selected = selected.filter((s) => s !== allergenId);
    } else {
      selected = [...selected, allergenId];
    }
  }
</script>

<!-- sync with: src/lib/components/AllergenDrillIn.svelte -->
<div class="space-y-4">
  <!-- Header row -->
  <div class="flex items-center gap-3 px-4 pt-3">
    <button
      type="button"
      aria-label="Zpět"
      class="text-text-muted text-sm px-1 py-1"
      onclick={onBack}
    >←</button>
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <span class="text-xl">{FAMILIES.find((f) => f.id === familyId)?.icon ?? ''}</span>
      <span class="text-sm font-semibold text-text">{familyStrings[familyId].name}</span>
    </div>
  </div>

  <!-- Allergen chips -->
  <div class="px-4">
    <div class="flex flex-wrap gap-2">
      {#each allergens as allergen}
        {@const cfg = getCategoryConfig(allergen.id)}
        {@const isSelected = selected.includes(allergen.id)}
        <button
          type="button"
          data-allergen-id={allergen.id}
          data-selected={isSelected}
          class="py-2 px-3 rounded-xl text-sm transition-all border flex items-center gap-1.5
            {isSelected && variant === 'primary'
              ? 'bg-primary/10 border-primary text-primary font-semibold'
              : isSelected && variant === 'danger'
                ? 'bg-danger/10 border-danger text-danger font-semibold'
                : 'bg-white border-surface-dark text-text'}"
          onclick={() => toggle(allergen.id)}
        >
          <span class="text-base leading-none">{cfg?.icon ?? allergen.icon}</span>
          {cfg?.name ?? allergen.id}
        </button>
      {/each}
    </div>
  </div>
</div>
