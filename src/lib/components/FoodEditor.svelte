<script lang="ts">
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import Chip from '$lib/components/Chip.svelte';

  const portionKinds: PortionKind[] = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'];
  const preparationMethods: PreparationMethod[] = ['boiled', 'steamed', 'baked', 'fried'];

  let {
    amount,
    preparation,
    eliminatedVariant = false,
    onAmountChange,
    onPreparationChange,
  }: {
    amount: PortionKind;
    preparation?: PreparationMethod;
    eliminatedVariant?: boolean;
    onAmountChange: (a: PortionKind) => void;
    onPreparationChange: (p: PreparationMethod | undefined) => void;
  } = $props();

  const chipVariant = $derived(eliminatedVariant ? 'danger' : 'default') as 'default' | 'danger';
</script>

<div class="space-y-2.5">
  <div>
    <p class="micro-label mb-1.5"
      class:text-danger={eliminatedVariant}>Množství</p>
    <div class="flex flex-wrap gap-1.5">
      {#each portionKinds as kind}
        <Chip
          active={amount === kind}
          variant={chipVariant}
          onclick={(e) => { e.stopPropagation(); onAmountChange(kind); }}
        >
          {portionStrings[kind].label}
        </Chip>
      {/each}
    </div>
  </div>

  <div>
    <p class="micro-label mb-1.5"
      class:text-danger={eliminatedVariant}>Příprava</p>
    <div class="flex flex-wrap gap-1.5">
      {#each preparationMethods as method}
        <Chip
          active={preparation === method}
          variant={chipVariant}
          onclick={(e) => { e.stopPropagation(); onPreparationChange(preparation === method ? undefined : method); }}
        >
          {preparationStrings[method].label}
        </Chip>
      {/each}
    </div>
  </div>
</div>
