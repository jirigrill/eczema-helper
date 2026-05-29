<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    active,
    onclick,
    children,
    class: extraClass = '',
  }: {
    active: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<button
  type="button"
  data-active={active}
  class="chip {active ? 'chip--active' : 'chip--muted'} {extraClass}"
  {onclick}
>
  {@render children?.()}
</button>
