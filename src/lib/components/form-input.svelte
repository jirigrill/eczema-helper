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
  <label for={id} class="block text-sm font-medium text-text mb-1">
    {label}
    {#if hint}
      <span class="text-text-muted font-normal">({hint})</span>
    {/if}
  </label>
  <input
    {id}
    bind:value
    class="w-full border border-surface-dark rounded-xl px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
    {...rest}
  />
</div>
