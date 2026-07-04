<script lang="ts">
  import { commonStrings, snimkyCs } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import type { SkinPhoto } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';

  let {
    photos,
    observationTimes = new Map(),
  }: {
    photos: SkinPhoto[];
    /**
     * Map from `SkinPhoto.observationId` → formatted H:MM Czech time of the
     * parent observation. Photos whose id is not in the map render without a
     * time overlay — orphan photos shouldn't happen given the FK relationship,
     * but we degrade silently rather than showing a broken pill.
     */
    observationTimes?: Map<string, string>;
  } = $props();

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
        {@const time = observationTimes.get(photo.observationId)}
        <div class="flex flex-col items-center gap-1">
          <div class="relative w-full">
            <img
              src={objectUrls[photo.id]}
              alt="Snímek kůže"
              class="w-full aspect-square object-cover rounded-xl"
            />
            {#if time}
              <span
                data-testid="skin-photo-time"
                class="absolute top-1 left-1 text-[9px] text-white bg-black/45 rounded px-1 py-0.5 leading-tight tabular-nums"
              >{time}</span>
            {/if}
          </div>
          <span class="text-[10px] text-text-muted text-center leading-tight">
            {regionStrings[photo.region].label}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</DayCard>
