<script lang="ts">
  import { commonStrings, snimkyCs } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import type { SkinPhoto } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';
  import PhotoLightbox from './PhotoLightbox.svelte';

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

  let lightboxPhotoId = $state<string | null>(null);

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
    <span class="text-text-muted text-[10px]">{snimkyCs(photos.length)}</span>
  {/if}
{/snippet}

<DayCard label={commonStrings.today.photoLabel} right={photos.length > 0 ? count : undefined}>
  {#if photos.length === 0}
    <p class="body-muted">{commonStrings.today.photoEmpty}</p>
  {:else}
    <div class="grid grid-cols-3 gap-2">
      {#each photos as photo, i (photo.id)}
        {@const time = observationTimes.get(photo.observationId)}
        {@const regionLabel = regionStrings[photo.region].label}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          role="button"
          tabindex="0"
          data-testid="skin-photo-thumb-{i}"
          class="relative aspect-square cursor-pointer"
          onclick={() => (lightboxPhotoId = photo.id)}
        >
          <img
            src={objectUrls[photo.id]}
            alt="Snímek kůže"
            class="h-full w-full rounded-xl object-cover"
          />
          <span
            data-testid="skin-photo-caption"
            class="absolute right-1 bottom-1 left-1 rounded bg-black/45 px-1 py-0.5 text-center text-[11px] leading-tight text-white tabular-nums"
            >{regionLabel}{#if time}{' · '}{time}{/if}</span
          >
        </div>
      {/each}
    </div>
  {/if}
</DayCard>

{#if lightboxPhotoId !== null}
  <PhotoLightbox src={objectUrls[lightboxPhotoId]} onClose={() => (lightboxPhotoId = null)} />
{/if}
