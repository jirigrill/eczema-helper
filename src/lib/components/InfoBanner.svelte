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

  const CLASSES: Record<typeof variant, string> = {
    info:    'bg-primary/5 border-primary/20',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    danger:  'bg-danger/5 border-danger/20',
  };
</script>

{#if href}
  <a
    {href}
    data-variant={variant}
    class="no-underline rounded-xl px-4 py-3 border {CLASSES[variant]} {extraClass}"
  >
    {@render children?.()}
  </a>
{:else}
  <div
    data-variant={variant}
    class="rounded-xl px-4 py-3 border {CLASSES[variant]} {extraClass}"
  >
    {@render children?.()}
  </div>
{/if}
