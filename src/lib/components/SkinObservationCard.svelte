<script lang="ts">
  import { commonStrings } from '$lib/strings/common';
  import { regionStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import { REGION_IDS, type SkinObservation, type SkinRegionRecord } from '$lib/domain/models';
  import { formatObservationTime } from '$lib/utils/date';
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
    [...observations].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );

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
    <p class="text-text-muted text-[12px]">
      {commonStrings.today.eczemaStatusEmpty}<a
        class="text-primary font-medium"
        href="/skin?date={date}&returnTo=/day/{date}">{commonStrings.today.eczemaStatusEmptyCta}</a
      >
    </p>
  {:else}
    <div class="divide-surface-dark divide-y">
      {#each sortedObservations as obs (obs.id)}
        {@const bumped = bumpedRegions(obs)}
        {@const hasNotes = !!obs.notes && obs.notes.length > 0}
        <a
          data-testid="skin-observation-row"
          href="/skin?date={obs.date}&id={obs.id}&returnTo=/day/{date}"
          class="flex gap-3 py-2 {hasNotes ? 'items-start' : 'items-center'}"
        >
          <div
            class="text-text-muted w-12 shrink-0 text-sm font-semibold tabular-nums {hasNotes
              ? 'mt-1'
              : ''}"
          >
            {formatObservationTime(obs.createdAt)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              {#if bumped.length === 0}
                <span
                  data-testid="skin-chip"
                  class="rounded-full px-2 py-0.5 text-[12px] font-medium {severityConfig[0].dot}"
                  >{commonStrings.today.eczemaAllCalmChip}</span
                >
              {:else}
                {#each bumped as region (region.id)}
                  <span
                    data-testid="skin-chip"
                    class="rounded-full px-2 py-0.5 text-[12px] font-medium {severityConfig[
                      region.level
                    ].tileBg}">{regionStrings[region.id].label}</span
                  >
                {/each}
              {/if}
            </div>
            {#if hasNotes}
              <div class="text-text-muted/80 mt-1 truncate text-[11px] italic">„{obs.notes}"</div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</DayCard>
