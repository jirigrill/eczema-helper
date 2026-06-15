<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * `compact` (default): `body-bold` text-sm — used by `settings`, `skin`,
   *   and the meal drill-in's chrome.
   * `large`: `.page-heading` text-2xl bold — same prominence as "Dnes" on
   *   the day page; the meal grid uses this so the meal-type label
   *   ("Oběd"/"Snídaně"/…) tells the mother which slot she is editing.
   */
  type Variant = 'compact' | 'large';

  let {
    title,
    onBack,
    right,
    variant = 'compact',
  }: {
    title: string;
    onBack?: () => void;
    right?: Snippet;
    variant?: Variant;
  } = $props();
</script>

<div class="sticky top-0 bg-surface z-20 border-b border-surface-dark px-4 py-2.5 flex items-center gap-3">
  {#if onBack}
    <!--
      Back-chevron sizing tracks the title:
      - `compact` → `text-lg` (matches body-bold heading weight)
      - `large`   → `text-3xl` (matches page-heading; -ml-1 + px-2 py-1
        keeps it thumb-tappable without pushing the title rightward)
    -->
    <button
      class="text-text leading-none {variant === 'large' ? 'text-3xl -ml-1 px-2 py-1' : 'text-lg'}"
      onclick={onBack}
    >‹</button>
  {/if}
  <h1 class="{variant === 'large' ? 'page-heading' : 'body-bold'} flex-1">{title}</h1>
  {#if right}
    {@render right()}
  {/if}
</div>
