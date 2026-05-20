<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant,
    children,
  }: {
    variant: 'info' | 'success' | 'warning' | 'danger';
    children?: Snippet;
  } = $props();

  const CLASSES: Record<typeof variant, string> = {
    info:    'bg-primary/5 border-primary/20',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    danger:  'bg-danger/5 border-danger/20',
  };
</script>

<div
  data-variant={variant}
  class="rounded-xl px-4 py-3 border {CLASSES[variant]}"
>
  {@render children?.()}
</div>
