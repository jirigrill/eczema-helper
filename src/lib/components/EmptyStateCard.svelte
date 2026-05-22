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

<div class="bg-white border-2 border-dashed border-surface-dark rounded-2xl p-4">
  <div class="flex items-center justify-between mb-1">
    <div class="section-label mb-0">{label}</div>
    {#if status}
      <span class="text-[10px] text-text-muted">{status}</span>
    {/if}
  </div>
  {@render children?.()}
</div>
