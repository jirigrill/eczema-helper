<script lang="ts">
  import type { Snippet } from 'svelte';

  import { commonStrings } from '$lib/strings/common';

  type FoodTileState = 'idle' | 'editing' | 'confirmed' | 'locked';

  let {
    name,
    state,
    eliminatedStatus,
    lockedPrior,
    summary,
    onclick,
    onRemove,
    editor,
  }: {
    name: string;
    state: FoodTileState;
    eliminatedStatus?: 'danger';
    /**
     * When state === 'locked', what the food's status was before the lock.
     * Locked + prior=confirmed keeps the confirmed fill at reduced emphasis
     * so the user can still see "this food is in the meal" while editing a
     * sibling. Locked + prior=idle (or omitted) renders the grey outline.
     */
    lockedPrior?: 'idle' | 'confirmed';
    /**
     * Optional one-line meta (porce · příprava) shown to the right of the
     * name. Used by the working-list rendering of this tile so a confirmed
     * food carries its dosing summary inline.
     */
    summary?: string;
    onclick?: () => void;
    /**
     * Optional remove (×) action. When provided, a small remove button
     * renders on the right side of the row. Click stops propagation so it
     * does not also fire {@link onclick}.
     */
    onRemove?: () => void;
    /** Rendered beneath the tile when state === 'editing'. */
    editor?: Snippet;
  } = $props();

  const isInteractive = $derived(state !== 'locked');
  const isLockedConfirmed = $derived(state === 'locked' && lockedPrior === 'confirmed');
  const dataState = $derived(
    state === 'locked' && lockedPrior === 'confirmed' && eliminatedStatus === 'danger' ? 'locked-danger-confirmed'
    : state === 'locked' && lockedPrior === 'confirmed' ? 'locked-confirmed'
    : eliminatedStatus === 'danger' && state === 'confirmed' ? 'danger-confirmed'
    : eliminatedStatus === 'danger' && state === 'editing' ? 'danger'
    : state === 'confirmed' ? 'confirmed'
    : eliminatedStatus ?? (state === 'locked' ? 'locked' : undefined)
  );

  const isFilled = $derived(state === 'confirmed' || isLockedConfirmed);

  function handleRemove(e: MouseEvent): void {
    e.stopPropagation();
    onRemove?.();
  }
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
        : isLockedConfirmed
          ? eliminatedStatus === 'danger'
            ? 'bg-danger border border-danger opacity-50'
            : 'bg-primary border border-primary opacity-50'
          : state === 'locked'
            ? 'border border-surface-dark bg-surface opacity-40'
            : eliminatedStatus === 'danger'
              ? 'border border-danger/30 bg-danger/08'
              : 'border border-surface-dark bg-white'}"
>
  <div class="flex items-center gap-2">
    <button
      type="button"
      disabled={!isInteractive}
      onclick={isInteractive ? onclick : undefined}
      class="flex-1 text-left py-2 px-3 text-sm
        {state === 'confirmed'
          ? 'text-white font-semibold'
          : isLockedConfirmed
            ? 'text-white font-semibold cursor-default'
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
    {#if summary}
      <span
        class="text-xs whitespace-nowrap pr-1
          {isFilled ? 'text-white' : 'text-text-muted'}"
      >{summary}</span>
    {/if}
    {#if onRemove}
      <button
        type="button"
        aria-label={`Odebrat ${name}`}
        onclick={handleRemove}
        class="px-2 py-1 mr-1 text-base leading-none
          {isFilled ? 'text-white/80 hover:text-white' : 'text-text-muted hover:text-danger'}"
      >×</button>
    {/if}
  </div>

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
