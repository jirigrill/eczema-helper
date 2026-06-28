<script lang="ts">
  import { createRawSnippet } from 'svelte';
  import { commonStrings, snimkyCs } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import type { SkinPhoto } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';

  let { photos }: { photos: SkinPhoto[] } = $props();

  let objectUrls = $state<string[]>([]);

  $effect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p.blob));
    objectUrls = urls;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  });

  const countSnippet = $derived(
    photos.length > 0
      ? createRawSnippet(() => ({
          render: () => `<span class="text-[10px] text-text-muted">${snimkyCs(photos.length)}</span>`,
        }))
      : undefined
  );
</script>

<DayCard label={commonStrings.today.photoLabel} right={countSnippet}>
  {#if photos.length === 0}
    <p class="body-muted">{commonStrings.today.photoEmpty}</p>
  {:else}
    <div class="grid grid-cols-3 gap-2">
      {#each photos as photo, i (photo.id)}
        <div class="flex flex-col items-center gap-1">
          <img
            src={objectUrls[i]}
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
