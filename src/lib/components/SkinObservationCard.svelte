<script lang="ts">
  import { commonStrings } from '$lib/strings/common';
  import { severityStrings, regionStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import {
    overallSeverity,
    type SkinObservation,
    type RegionLevel,
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

  /** Lowercase severity string → capitalized for rendering on this card. */
  function capitalize(s: string): string {
    return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
  }

  /** Czech region labels for regions with level > 0, joined by " · ". */
  function bumpedRegions(obs: SkinObservation): string {
    return obs.regions
      .filter((r) => r.level > 0)
      .map((r) => regionStrings[r.id].label)
      .join(' · ');
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
        {@const level = overallSeverity(obs) as RegionLevel}
        {@const regions = bumpedRegions(obs)}
        {@const hasNotes = !!obs.notes && obs.notes.length > 0}
        {@const multiLine = regions.length > 0 || hasNotes}
        <div
          data-testid="skin-observation-row"
          class="py-2 flex gap-3 {multiLine ? 'items-start' : 'items-center'}"
        >
          <div
            class="w-12 shrink-0 text-sm font-semibold tabular-nums text-text-muted {multiLine ? 'mt-0.5' : ''}"
          >{formatTime(obs.createdAt)}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class="w-2 h-2 rounded-full shrink-0 {severityConfig[level].dot}"
                aria-hidden="true"
              ></span>
              <span class="text-sm font-semibold text-text">{capitalize(severityStrings[level].label)}</span>
            </div>
            {#if regions.length > 0}
              <div class="text-[11px] text-text-muted truncate">{regions}</div>
            {/if}
            {#if hasNotes}
              <div class="text-[11px] text-text-muted/80 italic truncate mt-0.5">„{obs.notes}"</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</DayCard>
