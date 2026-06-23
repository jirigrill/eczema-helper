<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    REGION_IDS,
    type RegionId,
    type RegionLevel,
    type SkinObservation,
    type SkinPhotoInput,
    type SkinRegionRecord,
  } from '$lib/domain/models';
  import { randomUUID } from '$lib/utils/uuid';
  import { parseDayQuery } from '$lib/utils/day-query';
  import { commonStrings, oblastiCs } from '$lib/strings/common';
  import { regionStrings, severityStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import { skinObservationSession } from '$lib/stores/skin-observation-session';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import SkinPhotoGallery from '$lib/components/SkinPhotoGallery.svelte';

  const { date, returnTo } = $derived(parseDayQuery(page.url));

  function initialLevels(): Record<RegionId, RegionLevel> {
    return Object.fromEntries(REGION_IDS.map((id) => [id, 0])) as Record<RegionId, RegionLevel>;
  }

  // Per-region severity, defaulting every region to klidné (0). The mother
  // explicitly cycles back through klidné when retiring a region — there is
  // no "unknown" state.
  let levels = $state<Record<RegionId, RegionLevel>>(initialLevels());
  let active = $state<RegionId | null>(null);
  let note = $state('');
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let stagedPhotos = $state<SkinPhotoInput[]>([]);

  const loggedRegions = $derived(REGION_IDS.filter((id) => levels[id] > 0));
  // A klidné region with ≥1 staged photo also counts as logged.
  const canSave = $derived(loggedRegions.length > 0 || stagedPhotos.length > 0);

  function tapRegion(r: RegionId): void {
    // First tap activates without changing level. Subsequent taps on the
    // already-active region cycle 0→1→2→3→0. Activate-first prevents stray
    // taps from bumping severity when the user is hopping between regions.
    if (active !== r) {
      active = r;
    } else {
      const next = ((levels[r] + 1) % 4) as RegionLevel;
      levels = { ...levels, [r]: next };
    }
  }

  async function handleSave(): Promise<void> {
    if (saving || !canSave) return;
    saving = true;
    saveError = null;
    const regions: SkinRegionRecord[] = loggedRegions.map((id) => ({
      id,
      level: levels[id],
    }));
    const trimmed = note.trim();
    const observation: SkinObservation = {
      id: randomUUID(),
      date,
      createdAt: new Date().toISOString(),
      regions,
      ...(trimmed ? { notes: trimmed } : {}),
    };
    const result = await skinObservationSession.save(observation, stagedPhotos);
    saving = false;
    if (result.ok) {
      goto(returnTo);
    } else {
      saveError = commonStrings.skin.saveError;
    }
  }

  function saveButtonLabel(count: number): string {
    if (count === 0) return commonStrings.skin.saveDisabled;
    return `Uložit stav · ${oblastiCs(count)}`;
  }

  function handleFileInput(e: Event): void {
    if (!active) return;
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    const region = active;
    const newPhotos: SkinPhotoInput[] = Array.from(files).map((blob) => ({ region, blob }));
    stagedPhotos = [...stagedPhotos, ...newPhotos];
    // Reset the input so the same file can be added again if needed.
    (e.target as HTMLInputElement).value = '';
  }

  function deletePhoto(index: number): void {
    stagedPhotos = stagedPhotos.filter((_, i) => i !== index);
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
          {@const cfg = severityConfig[lvl]}
          {@const borderClass = isActive ? 'border-primary' : cfg.tileBorder}
          <button
            type="button"
            data-testid="skin-region-{id}"
            data-region={id}
            data-active={isActive ? 'true' : 'false'}
            data-level={lvl}
            aria-pressed={isActive}
            onclick={() => tapRegion(id)}
            class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-1 transition-all border-2 {borderClass} {cfg.tileBg} {isActive ? 'ring-2 ring-primary ring-offset-1' : ''}"
          >
            <span class="w-4 h-4 rounded-full {cfg.dot}"></span>
            <span class="text-[11px] font-medium text-text text-center leading-tight">{regionStrings[id].label}</span>
            <span class="text-[9px] text-text-muted">{severityStrings[lvl].label}</span>
          </button>
        {/each}
      </div>

      {#if !active}
        <p class="caption text-center">{commonStrings.skin.helperEmpty}</p>
      {:else}
        <label
          data-testid="skin-add-photo"
          class="flex items-center justify-center py-2 px-4 rounded-xl border-2 border-primary bg-white text-primary font-semibold text-sm cursor-pointer"
        >
          {commonStrings.skin.addPhotoPrefix}{regionStrings[active].label}
          <input
            type="file"
            accept="image/*"
            multiple
            class="sr-only"
            onchange={handleFileInput}
          />
        </label>
      {/if}

      {#if stagedPhotos.length > 0}
        <SkinPhotoGallery photos={stagedPhotos} onDelete={deletePhoto} />
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

{#if saveError}
  <Toast
    message={saveError}
    type="error"
    onClose={() => (saveError = null)}
  />
{/if}
