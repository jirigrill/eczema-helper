<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    status,
    children,
  }: {
    label: string;
    status?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="bg-white border-2 border-dashed border-surface-dark rounded-2xl p-3.5">
  <div class="flex items-center justify-between mb-1">
    <div class="text-[10px] text-text-muted uppercase tracking-wide font-semibold">{label}</div>
    {#if status}
      <span class="text-[10px] text-text-muted">{status}</span>
    {/if}
  </div>
  {@render children?.()}
</div>
