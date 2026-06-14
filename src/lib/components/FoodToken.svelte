<script lang="ts">
  import type { Snippet } from 'svelte';

  import { commonStrings } from '$lib/strings/common';

  type FoodTokenState = 'idle' | 'editing' | 'confirmed' | 'locked';

  let {
    name,
    state,
    eliminatedStatus,
    onclick,
    editor,
  }: {
    name: string;
    state: FoodTokenState;
    eliminatedStatus?: 'danger';
    onclick?: () => void;
    /** Rendered beneath the tile when state === 'editing'. */
    editor?: Snippet;
  } = $props();

  const isInteractive = $derived(state !== 'locked');
  const dataState = $derived(
    eliminatedStatus === 'danger' && state === 'confirmed' ? 'danger-confirmed'
    : eliminatedStatus === 'danger' && state === 'editing' ? 'danger'
    : state === 'confirmed' ? 'confirmed'
    : eliminatedStatus ?? (state === 'locked' ? 'locked' : undefined)
  );
</script>

<div
  data-state={dataState}
  class="rounded-xl overflow-hidden transition-all
    {state === 'editing'
      ? eliminatedStatus === 'danger'
        ? 'border-2 border-danger bg-danger/05'
        : 'border-2 border-primary bg-primary/05'
      : state === 'confirmed'
        ? eliminatedStatus === 'danger'
          ? 'bg-danger border border-danger'
          : 'bg-primary border border-primary'
        : state === 'locked'
          ? 'border border-surface-dark bg-surface opacity-40'
          : eliminatedStatus === 'danger'
            ? 'border border-danger/30 bg-danger/08'
            : 'border border-surface-dark bg-white'}"
>
  <button
    type="button"
    disabled={!isInteractive}
    onclick={isInteractive ? onclick : undefined}
    class="w-full text-left py-2 px-3 text-sm
      {state === 'confirmed'
        ? 'text-white font-semibold'
        : state === 'locked'
          ? 'text-text-muted cursor-default'
          : state === 'editing'
            ? eliminatedStatus === 'danger'
              ? 'text-danger font-medium'
              : 'text-primary font-medium'
            : eliminatedStatus === 'danger'
              ? 'text-danger'
              : 'text-text'}"
  >
    {name}
    {#if eliminatedStatus === 'danger' && state === 'idle'}
      <span class="ml-1 text-[10px] opacity-70">{commonStrings.meal.eliminatedChipLabel}</span>
    {/if}
  </button>

  {#if state === 'editing'}
    {#if eliminatedStatus === 'danger'}
      <p class="px-3 pb-1 text-xs text-danger font-medium">{commonStrings.meal.eliminatedTodayWarning}</p>
    {/if}
    {#if editor}
      <div class="px-3 pb-3">
        {@render editor()}
      </div>
    {/if}
  {/if}
</div>
