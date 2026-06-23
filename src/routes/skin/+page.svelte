<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    REGION_IDS,
    type RegionId,
    type RegionLevel,
    type SkinObservation,
    type SkinRegionRecord,
  } from '$lib/domain/models';
  import { randomUUID } from '$lib/utils/uuid';
  import { parseDayQuery } from '$lib/utils/day-query';
  import { commonStrings } from '$lib/strings/common';
  import { regionStrings, severityStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import { skinObservationSession } from '$lib/stores/skin-observation-session';
  import PageHeader from '$lib/components/PageHeader.svelte';

  const { date, returnTo } = $derived(parseDayQuery(page.url));

  // Per-region severity, defaulting every region to klidné (0). The mother
  // explicitly cycles back through klidné when retiring a region — there is
  // no "unknown" state.
  let levels = $state<Record<RegionId, RegionLevel>>(
    REGION_IDS.reduce(
      (acc, id) => ({ ...acc, [id]: 0 as RegionLevel }),
      {} as Record<RegionId, RegionLevel>,
    ),
  );
  let active = $state<RegionId | null>(null);
  let note = $state('');
  let saving = $state(false);

  const loggedRegions = $derived(REGION_IDS.filter((id) => levels[id] > 0));
  const canSave = $derived(loggedRegions.length > 0);

  function tapRegion(r: RegionId): void {
    if (active !== r) {
      // Activate only — the level stays put so a calm region tapped by mistake
      // keeps reading klidné.
      active = r;
    } else {
      const next = ((levels[r] + 1) % 4) as RegionLevel;
      levels = { ...levels, [r]: next };
    }
  }

  async function handleSave(): Promise<void> {
    if (saving || !canSave) return;
    saving = true;
    const regions: SkinRegionRecord[] = loggedRegions.map((id) => ({
      id,
      level: levels[id],
    }));
    const observation: SkinObservation = {
      id: randomUUID(),
      date,
      createdAt: new Date().toISOString(),
      regions,
      ...(note.trim() ? { notes: note.trim() } : {}),
    };
    const result = await skinObservationSession.save(observation, []);
    saving = false;
    if (result.ok) goto(returnTo);
  }

  function tileBorderClass(id: RegionId): string {
    if (active === id) return 'border-primary';
    return severityConfig[levels[id]].tileBorder;
  }

  function tileBackgroundClass(id: RegionId): string {
    return severityConfig[levels[id]].tileBg;
  }

  function tileDotClass(id: RegionId): string {
    return severityConfig[levels[id]].dot;
  }

  function saveButtonLabel(count: number): string {
    if (count === 0) return commonStrings.skin.saveDisabled;
    const noun = count === 1 ? 'oblast' : 'oblasti';
    return `Uložit stav · ${count} ${noun}`;
  }
</script>

<div class="page-container pb-24">
  <PageHeader title={commonStrings.skin.heading} onBack={() => goto(returnTo)} />

  <div class="px-4 pt-4">
    <div class="card-base space-y-4">
      <div class="flex items-center justify-between">
        <p class="eyebrow">{commonStrings.skin.eyebrow}</p>
        <span class="caption">{commonStrings.skin.tapHint}</span>
      </div>

      <div class="grid grid-cols-3 gap-2" data-testid="skin-region-grid">
        {#each REGION_IDS as id (id)}
          {@const isActive = active === id}
          {@const lvl = levels[id]}
          <button
            type="button"
            data-testid="skin-region-{id}"
            data-region={id}
            data-active={isActive ? 'true' : 'false'}
            data-level={lvl}
            aria-pressed={isActive}
            onclick={() => tapRegion(id)}
            class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-1 transition-all {isActive ? 'border-[3px]' : 'border-2'} {tileBorderClass(id)} {tileBackgroundClass(id)}"
          >
            <span
              class="w-4 h-4 rounded-full {tileDotClass(id)}"
            ></span>
            <span class="text-[11px] font-medium text-text text-center leading-tight">{regionStrings[id].label}</span>
            <span class="text-[9px] text-text-muted">{severityStrings[lvl].label}</span>
          </button>
        {/each}
      </div>

      {#if !active}
        <p class="caption text-center">{commonStrings.skin.helperEmpty}</p>
      {/if}

      <textarea
        bind:value={note}
        placeholder={commonStrings.skin.notePlaceholder}
        rows="2"
        class="input-base w-full resize-none"
        data-testid="skin-note"
      ></textarea>

      <button
        type="button"
        data-testid="skin-save"
        aria-label={commonStrings.skin.saveAriaLabel}
        class="w-full py-3 rounded-xl font-semibold text-sm {canSave ? 'bg-primary text-white' : 'bg-surface-dark text-text-muted'}"
        disabled={!canSave || saving}
        onclick={handleSave}
      >
        {saveButtonLabel(loggedRegions.length)}
      </button>
    </div>
  </div>
</div>
