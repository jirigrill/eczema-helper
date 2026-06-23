<script lang="ts">
  import { createRawSnippet } from 'svelte';
  import { commonStrings, zaznamyCs } from '$lib/strings/common';
  import { severityStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import {
    overallSeverity,
    type SkinObservation,
    type RegionLevel,
  } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';

  let { observations }: { observations: SkinObservation[] } = $props();

  // Stub summary (issue #361): show the day's worst severity dot + label.
  // The full per-region drill-in lives in a later slice.
  const dayLevel: RegionLevel = $derived(
    observations.reduce<RegionLevel>(
      (max, o) => (overallSeverity(o) > max ? overallSeverity(o) : max),
      0,
    ),
  );

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
      <div class="flex items-center gap-2" data-testid="skin-observation-summary">
        <span
          class="w-3 h-3 rounded-full shrink-0 {severityConfig[dayLevel].dot}"
          aria-hidden="true"
        ></span>
        <span class="text-[12px] font-semibold text-text">{severityStrings[dayLevel].label}</span>
      </div>
      {#each observations as obs (obs.id)}
        {#if obs.notes}
          <span class="text-[11px] text-text-muted">{obs.notes}</span>
        {/if}
      {/each}
    </div>
  {/if}
</DayCard>
