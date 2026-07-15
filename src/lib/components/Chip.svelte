<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    active,
    variant = 'default',
    onclick,
    children,
    class: extraClass = '',
  }: {
    active: boolean;
    variant?: 'default' | 'danger';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  } = $props();

  const cls = $derived(
    variant === 'danger'
      ? active
        ? 'chip--danger-active'
        : 'chip--danger-muted'
      : active
        ? 'chip--active'
        : 'chip--muted',
  );
</script>

<button type="button" data-active={active} class="chip {cls} {extraClass}" {onclick}>
  {@render children?.()}
</button>
