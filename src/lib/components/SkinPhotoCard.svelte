<script lang="ts">
  import { onMount } from 'svelte';
  import { commonStrings } from '$lib/strings/common';
  import type { SkinPhoto } from '$lib/domain/models';
  import type { SkinPhotoStore } from '$lib/domain/ports/skin-photo-store';
  import DayCard from './DayCard.svelte';

  let { date, photoStore }: { date: string; photoStore: SkinPhotoStore } = $props();

  let photos = $state<SkinPhoto[]>([]);
  let objectUrls = $state<string[]>([]);

  onMount(() => {
    const subscription = photoStore.liveQueryByDate(date).subscribe({
      next: (rows) => {
        for (const url of objectUrls) URL.revokeObjectURL(url);
        photos = rows ?? [];
        objectUrls = photos.map((p) => URL.createObjectURL(p.blob));
      },
      error: () => {
        photos = [];
        objectUrls = [];
      },
    });
    return () => {
      subscription.unsubscribe();
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  });
</script>

<DayCard label={commonStrings.today.photoLabel}>
  {#if photos.length === 0}
    <p class="body-muted">{commonStrings.today.photoEmpty}</p>
  {:else}
    <div class="grid grid-cols-3 gap-2">
      {#each photos as photo, i (photo.id)}
        <img
          src={objectUrls[i]}
          alt="Snímek kůže"
          class="w-full aspect-square object-cover rounded-xl"
        />
      {/each}
    </div>
  {/if}
</DayCard>
