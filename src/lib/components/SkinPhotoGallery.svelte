<script lang="ts">
  import type { RegionId } from '$lib/domain/models';
  import { regionStrings } from '$lib/strings/skin-regions';
  import { commonStrings } from '$lib/strings/common';
  import PhotoLightbox from './PhotoLightbox.svelte';

  /**
   * A displayable photo — a blob to preview, a region to label, and (in edit
   * mode) an optional `markedForRemoval` flag that greys the thumb and swaps
   * the × for an Undo affordance. Compose mode passes `SkinPhotoInput[]`
   * verbatim (no `markedForRemoval` present), matching the original API.
   */
  export type SkinPhotoGalleryItem = {
    blob: Blob;
    region: RegionId;
    markedForRemoval?: boolean;
  };

  let {
    photos,
    onDelete,
  }: {
    photos: SkinPhotoGalleryItem[];
    /**
     * Tap on the ×: removes an active photo (compose or staged-add) or, in edit
     * mode, marks a persisted photo for removal. Tap on the Undo affordance
     * over a greyed persisted photo calls the same handler — the parent
     * inspects `photos[index].markedForRemoval` and flips it back.
     */
    onDelete: (index: number) => void;
  } = $props();

  let lightboxIndex = $state<number | null>(null);

  let objectUrls = $state<string[]>([]);

  $effect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p.blob));
    objectUrls = urls;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  });

  function openLightbox(i: number): void {
    lightboxIndex = i;
  }

  function closeLightbox(): void {
    lightboxIndex = null;
  }
</script>

{#if photos.length > 0}
  <!--
    Visual treatment matches issue #380: thumbs sit in a 3-col grid with
    a black-overlay region label pinned to the bottom of each thumb
    (replaces the older caption-under-thumb approach). No photo count
    label — that lives on the per-day card, not the staging gallery.
    A persisted photo marked for removal (edit mode, ADR-0021) uses a
    reduced-opacity thumb and swaps the × for an Undo affordance.
  -->
  <div data-testid="skin-photo-gallery" class="grid grid-cols-3 gap-2">
    {#each photos as photo, i (i)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        role="button"
        tabindex="0"
        data-testid="skin-photo-thumb-{i}"
        data-marked-for-removal={photo.markedForRemoval ? 'true' : 'false'}
        class="relative aspect-square cursor-pointer {photo.markedForRemoval ? 'opacity-40' : ''}"
        onclick={() => openLightbox(i)}
      >
        <img src={objectUrls[i]} alt="Snímek kůže" class="h-full w-full rounded-xl object-cover" />
        {#if photo.markedForRemoval}
          <button
            type="button"
            data-testid="skin-photo-undo-{i}"
            class="absolute top-1 right-1 flex h-5 items-center rounded-full bg-black/60 px-1.5 text-[10px] leading-none font-medium text-white"
            aria-label={commonStrings.skin.undoPhotoRemoval}
            onclick={(e) => {
              e.stopPropagation();
              onDelete(i);
            }}>↺</button
          >
        {:else}
          <button
            type="button"
            data-testid="skin-photo-delete-{i}"
            class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white"
            aria-label="Smazat snímek"
            onclick={(e) => {
              e.stopPropagation();
              onDelete(i);
            }}>×</button
          >
        {/if}
        <span
          class="absolute right-1 bottom-1 left-1 rounded bg-black/45 px-1 py-0.5 text-center text-[9px] leading-tight text-white"
        >
          {regionStrings[photo.region].label}
        </span>
      </div>
    {/each}
  </div>
{/if}

{#if lightboxIndex !== null}
  <PhotoLightbox src={objectUrls[lightboxIndex]} onClose={closeLightbox} />
{/if}
