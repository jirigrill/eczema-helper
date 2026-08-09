<script lang="ts">
  import type { Snippet } from 'svelte';

  type FoodTileState = 'idle' | 'editing' | 'confirmed' | 'locked';

  let {
    name,
    state,
    lockedPrior,
    summary,
    variant = 'tile',
    onclick,
    onRemove,
    editor,
  }: {
    name: string;
    state: FoodTileState;
    /**
     * `tile` (default): the drill-in rendering — confirmed foods get the
     *   bordeaux fill so they stand out from idle siblings in the family list.
     * `list`: the working-list rendering — every food shown is already added,
     *   so a confirmed food renders plain (white) instead of filled; the porce
     *   summary + remove × already mark it as added.
     */
    variant?: 'tile' | 'list';
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
  // Working-list ('list') variant renders confirmed foods plain (white) rather
  // than bordeaux-filled — see the `variant` prop doc.
  const plainFill = $derived(variant === 'list' && (state === 'confirmed' || isLockedConfirmed));
  const dataState = $derived(
    isLockedConfirmed
      ? 'locked-confirmed'
      : state === 'confirmed'
        ? 'confirmed'
        : state === 'locked'
          ? 'locked'
          : undefined,
  );

  const isFilled = $derived(!plainFill && (state === 'confirmed' || isLockedConfirmed));

  function handleRemove(e: MouseEvent): void {
    e.stopPropagation();
    onRemove?.();
  }
</script>

<div
  data-state={dataState}
  class="overflow-hidden rounded-xl transition-all
    {state === 'editing'
    ? 'border-primary bg-primary/05 border-2'
    : plainFill
      ? 'border-surface-dark border bg-white'
      : state === 'confirmed'
        ? 'bg-primary border-primary border'
        : isLockedConfirmed
          ? 'bg-primary border-primary border opacity-50'
          : state === 'locked'
            ? 'border-surface-dark bg-surface border opacity-40'
            : 'border-surface-dark border bg-white'}"
>
  <div class="flex items-center gap-2">
    <button
      type="button"
      disabled={!isInteractive}
      onclick={isInteractive ? onclick : undefined}
      class="flex-1 px-3 py-2 text-left text-sm
        {plainFill
        ? state === 'confirmed'
          ? 'text-text font-semibold'
          : 'text-text cursor-default font-semibold'
        : state === 'confirmed'
          ? 'font-semibold text-white'
          : isLockedConfirmed
            ? 'cursor-default font-semibold text-white'
            : state === 'locked'
              ? 'text-text-muted cursor-default'
              : state === 'editing'
                ? 'text-primary font-medium'
                : 'text-text'}"
    >
      {name}
    </button>
    {#if summary}
      <span
        class="caption pr-1 whitespace-nowrap
          {isFilled ? 'text-white' : ''}">{summary}</span
      >
    {/if}
    {#if onRemove}
      <button
        type="button"
        aria-label={`Odebrat ${name}`}
        onclick={handleRemove}
        class="mr-1 px-2 py-1 text-base leading-none
          {isFilled ? 'text-white/80 hover:text-white' : 'text-text-muted hover:text-danger'}"
        >×</button
      >
    {/if}
  </div>

  {#if state === 'editing'}
    {#if editor}
      <div class="px-3 pb-3">
        {@render editor()}
      </div>
    {/if}
  {/if}
</div>
