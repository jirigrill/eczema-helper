<script lang="ts">
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import type { FoodForm } from '$lib/data/allergen-catalog/allergen-catalog';
  import { formPreparations } from '$lib/domain/preparation-rules';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import Chip from '$lib/components/Chip.svelte';

  const portionKinds: PortionKind[] = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'];

  let {
    amount,
    preparation,
    form,
    eliminatedVariant = false,
    onAmountChange,
    onPreparationChange,
  }: {
    amount: PortionKind;
    preparation?: PreparationMethod;
    form: FoodForm;
    eliminatedVariant?: boolean;
    onAmountChange: (a: PortionKind) => void;
    onPreparationChange: (p: PreparationMethod | undefined) => void;
  } = $props();

  const chipVariant = $derived(eliminatedVariant ? 'danger' : 'default') as 'default' | 'danger';
  const preparationMethods = $derived(formPreparations[form]);
</script>

<div class="space-y-2.5">
  <div>
    <p class="eyebrow mb-1.5"
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

  {#if preparationMethods.length > 0}
    <div>
      <p class="eyebrow mb-1.5"
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
  {/if}
</div>
