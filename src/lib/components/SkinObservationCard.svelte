<script lang="ts">
  import { liveQuery } from 'dexie';
  import { onMount } from 'svelte';
  import { db } from '$lib/db/atopic-db';
  import { commonStrings } from '$lib/strings/common';
  import type { SkinObservation } from '$lib/domain/models';

  let { date }: { date: string } = $props();

  const statusLabels: Record<SkinObservation['status'], string> = commonStrings.program.skinOutcomes;

  let observations = $state<SkinObservation[]>([]);

  onMount(() => {
    const subscription = liveQuery(() =>
      db.skin_observations.where('date').equals(date).toArray()
    ).subscribe({
      next: (rows) => { observations = rows ?? []; },
      error: () => { observations = []; },
    });
    return () => subscription.unsubscribe();
  });
</script>

<div class="bg-white border border-surface-dark rounded-2xl overflow-hidden">
  <div class="px-3.5 pt-3 pb-1 flex items-center justify-between">
    <span class="section-label">{commonStrings.today.eczemaStatusLabel}</span>
  </div>
  {#if observations.length === 0}
    <div class="px-3.5 pb-3 body-muted">{commonStrings.today.eczemaStatusEmpty}</div>
  {:else}
    <div class="px-3.5 pb-3 space-y-2">
      {#each observations as obs (obs.id)}
        <div class="flex flex-col gap-0.5">
          <span class="text-[12px] font-semibold text-text">{statusLabels[obs.status]}</span>
          {#if obs.notes}
            <span class="text-[11px] text-text-muted">{obs.notes}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
