<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = HTMLInputAttributes & {
    label: string;
    id: string;
    hint?: string;
  };

  // This is an app component, never a custom element; `...rest` forwards
  // native input attributes, so the custom-element inference warning is moot.
  // svelte-ignore custom_element_props_identifier
  let { label, id, hint, value = $bindable(''), ...rest }: Props = $props();
</script>

<div>
  <label for={id} class="body-medium mb-1 block">
    {label}
    {#if hint}
      <span class="text-text-muted font-normal">({hint})</span>
    {/if}
  </label>
  <input
    {id}
    bind:value
    class="border-surface-dark text-text focus:ring-primary/40 w-full rounded-xl border bg-white px-4 py-3 text-base focus:ring-2 focus:outline-none"
    {...rest}
  />
</div>

<style>
  /* Safari renders input[type="date"] as inline-flex, causing width:100% to be
     ignored on iOS 17 and earlier. appearance:none resets it to a standard
     box-model element so width and padding behave as expected. */
  input[type='date'] {
    -webkit-appearance: none;
    appearance: none;
  }
</style>
