<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = HTMLInputAttributes & {
    label: string;
    id: string;
    hint?: string;
  };

  let { label, id, hint, value = $bindable(''), ...rest }: Props = $props();
</script>

<div>
  <label for={id} class="block body-medium mb-1">
    {label}
    {#if hint}
      <span class="text-text-muted font-normal">({hint})</span>
    {/if}
  </label>
  <input
    {id}
    bind:value
    class="w-full border border-surface-dark rounded-xl px-4 py-3 text-base text-text focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
    {...rest}
  />
</div>

<style>
  /* Safari renders input[type="date"] as inline-flex, causing width:100% to be
     ignored on iOS 17 and earlier. appearance:none resets it to a standard
     box-model element so width and padding behave as expected. */
  input[type="date"] {
    -webkit-appearance: none;
    appearance: none;
  }
</style>
