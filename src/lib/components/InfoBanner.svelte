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
  <a {href} data-state={variant} class="rounded-xl border px-4 py-3 no-underline {extraClass}">
    {@render children?.()}
  </a>
{:else}
  <div data-state={variant} class="rounded-xl border px-4 py-3 {extraClass}">
    {@render children?.()}
  </div>
{/if}
