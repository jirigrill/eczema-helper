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

<div class="card-base">
  <div class="flex items-center justify-between">
    <p class="section-label mb-0">{label}</p>
    {#if onEdit}
      <button class="text-xs text-primary" onclick={onEdit}>Upravit</button>
    {/if}
  </div>
  {@render children?.()}
</div>
