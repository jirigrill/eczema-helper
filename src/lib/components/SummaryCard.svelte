<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    onEdit,
    children,
  }: {
    label: string;
    onEdit?: () => void;
    children?: Snippet;
  } = $props();
</script>

<div class="bg-white rounded-xl border border-surface-dark p-4">
  <div class="flex items-center justify-between mb-1">
    <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
    {#if onEdit}
      <button class="text-xs text-primary" onclick={onEdit}>Upravit</button>
    {/if}
  </div>
  {@render children?.()}
</div>
