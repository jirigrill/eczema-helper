<script lang="ts">
  import AllergenChip from '$lib/components/AllergenChip.svelte';

  type ChipColor = 'neutral' | 'danger';

  let {
    slugs,
    color,
  }: {
    slugs: string[];
    color: ChipColor;
  } = $props();
</script>

{#if slugs.length > 0}
  <div class="flex flex-wrap gap-1.5">
    {#each slugs as slug (slug)}
      <span
        data-state={color}
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
          {color === 'danger'
            ? 'bg-danger/10 border border-danger/30 text-danger'
            : 'bg-surface border border-surface-dark text-text-muted'}"
      >
        <AllergenChip {slug} bare />
      </span>
    {/each}
  </div>
{/if}
