<script lang="ts">
  import { commonStrings } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import {
    REGION_IDS,
    type SkinObservation,
    type SkinRegionRecord,
  } from '$lib/domain/models';
  import DayCard from './DayCard.svelte';

  let {
    observations,
    date,
  }: {
    observations: SkinObservation[];
    date: string;
  } = $props();

  /** Sort ascending by createdAt; never mutates the input array. */
  const sortedObservations = $derived(
    [...observations].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  );

  /** "9:12" — local hour (no leading zero), minute padded. */
  function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Regions with `level > 0`, sorted in canonical `REGION_IDS` order so chip
   * order is stable regardless of input array order.
   */
  function bumpedRegions(obs: SkinObservation): SkinRegionRecord[] {
    return obs.regions
      .filter((r) => r.level > 0)
      .sort((a, b) => REGION_IDS.indexOf(a.id) - REGION_IDS.indexOf(b.id));
  }
</script>

<DayCard label={commonStrings.today.eczemaStatusLabel}>
  {#if sortedObservations.length === 0}
    <p class="text-[12px] text-text-muted">
      {commonStrings.today.eczemaStatusEmpty}<a
        class="text-primary font-medium"
        href="/skin?date={date}&returnTo=/day/{date}"
      >{commonStrings.today.eczemaStatusEmptyCta}</a>
    </p>
  {:else}
    <div class="divide-y divide-surface-dark">
      {#each sortedObservations as obs (obs.id)}
        {@const bumped = bumpedRegions(obs)}
        {@const hasNotes = !!obs.notes && obs.notes.length > 0}
        <a
          data-testid="skin-observation-row"
          href="/skin?date={obs.date}&id={obs.id}&returnTo=/day/{date}"
          class="py-2 flex gap-3 {hasNotes ? 'items-start' : 'items-center'}"
        >
          <div
            class="w-12 shrink-0 text-sm font-semibold tabular-nums text-text-muted {hasNotes ? 'mt-1' : ''}"
          >{formatTime(obs.createdAt)}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              {#if bumped.length === 0}
                <span
                  data-testid="skin-chip"
                  class="text-[12px] font-medium rounded-full px-2 py-0.5 {severityConfig[0].dot}"
                >{commonStrings.today.eczemaAllCalmChip}</span>
              {:else}
                {#each bumped as region (region.id)}
                  <span
                    data-testid="skin-chip"
                    class="text-[12px] font-medium rounded-full px-2 py-0.5 {severityConfig[region.level].tileBg}"
                  >{regionStrings[region.id].label}</span>
                {/each}
              {/if}
            </div>
            {#if hasNotes}
              <div class="text-[11px] text-text-muted/80 italic truncate mt-1">„{obs.notes}"</div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</DayCard>
