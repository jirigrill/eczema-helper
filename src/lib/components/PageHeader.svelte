<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    onBack,
    right,
  }: {
    title: string;
    onBack?: () => void;
    right?: Snippet;
  } = $props();
</script>

<div class="sticky top-0 bg-surface z-20 border-b border-surface-dark px-4 py-2.5 flex items-center gap-3">
  {#if onBack}
    <button class="text-text text-lg leading-none" onclick={onBack}>‹</button>
  {/if}
  <h1 class="body-bold flex-1">{title}</h1>
  {#if right}
    {@render right()}
  {/if}
</div>
