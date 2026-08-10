<script lang="ts">
  import type { PortionKind, PreparationMethod } from '$lib/domain/models';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import Chip from '$lib/components/Chip.svelte';

  const portionKinds: PortionKind[] = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'];

  let {
    amount,
    preparation,
    preparations,
    onAmountChange,
    onPreparationChange,
  }: {
    amount: PortionKind;
    preparation?: PreparationMethod;
    /** The preparation chips this food offers, in display order (ADR-0028). */
    preparations: readonly PreparationMethod[];
    onAmountChange: (a: PortionKind) => void;
    onPreparationChange: (p: PreparationMethod | undefined) => void;
  } = $props();
</script>

<div class="space-y-2.5">
  <div>
    <p class="eyebrow mb-1.5">Množství</p>
    <div class="flex flex-wrap gap-1.5">
      {#each portionKinds as kind}
        <Chip
          active={amount === kind}
          onclick={(e) => {
            e.stopPropagation();
            onAmountChange(kind);
          }}
        >
          {portionStrings[kind].label}
        </Chip>
      {/each}
    </div>
  </div>

  {#if preparations.length > 0}
    <div>
      <p class="eyebrow mb-1.5">Příprava</p>
      <div class="flex flex-wrap gap-1.5">
        {#each preparations as method}
          <Chip
            active={preparation === method}
            onclick={(e) => {
              e.stopPropagation();
              onPreparationChange(preparation === method ? undefined : method);
            }}
          >
            {preparationStrings[method].label}
          </Chip>
        {/each}
      </div>
    </div>
  {/if}
</div>
