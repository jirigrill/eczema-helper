<script lang="ts">
  import { commonStrings, snimkyCs } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import type { SkinPhoto } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';

  let { photos }: { photos: SkinPhoto[] } = $props();

  // Keyed by photo.id so URLs stay attached to their photo if the array is
  // ever filtered or reordered (index-keyed lookups would desync).
  let objectUrls = $state<Record<string, string>>({});

  $effect(() => {
    const next: Record<string, string> = {};
    for (const p of photos) next[p.id] = URL.createObjectURL(p.blob);
    objectUrls = next;
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  });
</script>

{#snippet count()}
  {#if photos.length > 0}
    <span class="text-[10px] text-text-muted">{snimkyCs(photos.length)}</span>
  {/if}
{/snippet}

<DayCard label={commonStrings.today.photoLabel} right={photos.length > 0 ? count : undefined}>
  {#if photos.length === 0}
    <p class="body-muted">{commonStrings.today.photoEmpty}</p>
  {:else}
    <div class="grid grid-cols-3 gap-2">
      {#each photos as photo (photo.id)}
        <div class="flex flex-col items-center gap-1">
          <img
            src={objectUrls[photo.id]}
            alt="Snímek kůže"
            class="w-full aspect-square object-cover rounded-xl"
          />
          <span class="text-[10px] text-text-muted text-center leading-tight">
            {regionStrings[photo.region].label}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</DayCard>
