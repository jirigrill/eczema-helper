<script lang="ts">
  import { onMount } from 'svelte';
  import { createRawSnippet } from 'svelte';
  import { commonStrings, zaznamyCs } from '$lib/strings/common';
  import type { SkinObservation } from '$lib/domain/models';
  import type { SkinObservationRepository } from '$lib/domain/ports/skin-observation-repository';
  import DayCard from './DayCard.svelte';

  let { date, repo }: { date: string; repo: SkinObservationRepository } = $props();

  const statusLabels: Record<SkinObservation['status'], string> = commonStrings.program.skinOutcomes;

  let observations = $state<SkinObservation[]>([]);

  onMount(() => {
    const subscription = repo.liveQueryByDate(date).subscribe({
      next: (rows) => { observations = rows ?? []; },
      error: () => { observations = []; },
    });
    return () => subscription.unsubscribe();
  });

  const countSnippet = $derived(
    observations.length > 0
      ? createRawSnippet(() => ({
          render: () => `<span class="text-[10px] text-text-muted">${zaznamyCs(observations.length)}</span>`,
        }))
      : undefined
  );
</script>

<DayCard label={commonStrings.today.eczemaStatusLabel} right={countSnippet}>
  {#if observations.length === 0}
    <p class="body-muted">{commonStrings.today.eczemaStatusEmpty}</p>
  {:else}
    <div class="space-y-2">
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
</DayCard>
