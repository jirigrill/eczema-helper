<script lang="ts">
  import { liveQuery } from 'dexie';
  import { onMount } from 'svelte';
  import { db } from '$lib/db/atopic-db';
  import { commonStrings } from '$lib/strings/common';
  import type { SkinPhoto } from '$lib/domain/models';

  let { date }: { date: string } = $props();

  let photos = $state<SkinPhoto[]>([]);
  let objectUrls = $state<string[]>([]);

  onMount(() => {
    const subscription = liveQuery(() =>
      db.photos.where('date').equals(date).toArray()
    ).subscribe({
      next: (rows) => {
        // Revoke previous URLs before creating new ones
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

<div class="bg-white border border-surface-dark rounded-2xl overflow-hidden">
  <div class="px-3.5 pt-3 pb-1 flex items-center justify-between">
    <span class="section-label">{commonStrings.today.photoLabel}</span>
  </div>
  {#if photos.length === 0}
    <div class="px-3.5 pb-3 body-muted">{commonStrings.today.photoEmpty}</div>
  {:else}
    <div class="px-3.5 pb-3 grid grid-cols-3 gap-2">
      {#each photos as photo, i (photo.id)}
        <img
          src={objectUrls[i]}
          alt="Snímek kůže"
          class="w-full aspect-square object-cover rounded-lg"
        />
      {/each}
    </div>
  {/if}
</div>
