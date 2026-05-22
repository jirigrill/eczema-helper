<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant,
    href,
    class: extraClass = '',
    children,
  }: {
    variant: 'info' | 'success' | 'warning' | 'danger';
    href?: string;
    class?: string;
    children?: Snippet;
  } = $props();
</script>

{#if href}
  <a
    {href}
    data-state={variant}
    class="no-underline rounded-xl px-4 py-3 border {extraClass}"
  >
    {@render children?.()}
  </a>
{:else}
  <div
    data-state={variant}
    class="rounded-xl px-4 py-3 border {extraClass}"
  >
    {@render children?.()}
  </div>
{/if}
