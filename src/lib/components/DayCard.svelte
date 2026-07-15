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

<div class="border-surface-dark rounded-2xl border bg-white p-3.5">
  <div class="mb-2 flex items-center justify-between">
    <span class="text-text-muted text-[10px] font-semibold tracking-wide uppercase">{label}</span>
    {#if right}
      <span data-testid="day-card-right">{@render right()}</span>
    {/if}
  </div>
  {@render children?.()}
</div>
