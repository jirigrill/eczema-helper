<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    right,
    children,
  }: {
    label: string;
    right?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="bg-white border border-surface-dark rounded-2xl p-3.5">
  <div class="flex items-center justify-between mb-2">
    <span class="section-label mb-0">{label}</span>
    {#if right}
      <span data-testid="day-card-right">{@render right()}</span>
    {/if}
  </div>
  {@render children?.()}
</div>
