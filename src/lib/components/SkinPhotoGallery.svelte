<script lang="ts">
  import type { SkinPhotoInput } from '$lib/domain/models';
  import { regionStrings } from '$lib/strings/skin-regions';

  let {
    photos,
    onDelete,
  }: {
    photos: SkinPhotoInput[];
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

  function handleBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) closeLightbox();
  }
</script>

{#if photos.length > 0}
  <!--
    Visual treatment matches issue #380: thumbs sit in a 3-col grid with
    a black-overlay region label pinned to the bottom of each thumb
    (replaces the older caption-under-thumb approach). No photo count
    label — that lives on the per-day card, not the staging gallery.
  -->
  <div data-testid="skin-photo-gallery" class="grid grid-cols-3 gap-2">
    {#each photos as photo, i (i)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        role="button"
        tabindex="0"
        data-testid="skin-photo-thumb-{i}"
        class="relative aspect-square cursor-pointer"
        onclick={() => openLightbox(i)}
      >
        <img
          src={objectUrls[i]}
          alt="Snímek kůže"
          class="w-full h-full object-cover rounded-xl"
        />
        <button
          type="button"
          data-testid="skin-photo-delete-{i}"
          class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center leading-none"
          aria-label="Smazat snímek"
          onclick={(e) => { e.stopPropagation(); onDelete(i); }}
        >×</button>
        <span class="absolute bottom-1 left-1 right-1 text-[9px] text-white text-center leading-tight bg-black/45 rounded px-1 py-0.5">
          {regionStrings[photo.region].label}
        </span>
      </div>
    {/each}
  </div>
{/if}

{#if lightboxIndex !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Náhled snímku"
    data-testid="skin-photo-lightbox"
    class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
    onclick={handleBackdropClick}
  >
    <img
      src={objectUrls[lightboxIndex]}
      alt="Snímek kůže"
      class="max-w-full max-h-full object-contain rounded-xl"
    />
    <button
      type="button"
      data-testid="skin-lightbox-close"
      class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white text-lg flex items-center justify-center"
      aria-label="Zavřít"
      onclick={closeLightbox}
    >×</button>
  </div>
{/if}
