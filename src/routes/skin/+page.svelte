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
  import { commonStrings } from '$lib/strings/common';
  import { regionStrings, severityStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import { formatDateLongCs } from '$lib/utils/date';
  import { skinObservationSession } from '$lib/stores/skin-observation-session';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SkinPhotoGallery from '$lib/components/SkinPhotoGallery.svelte';
  import Toast from '$lib/components/Toast.svelte';

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

  // Issue #379, ADR-0021 (klidné amendment): every /skin visit can save. Klidné is positive
  // evidence — opening the page and tapping Uložit records "I checked, all
  // calm" for all nine regions. No engagement gate.
  const canSave = true;

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
    if (saving) return;
    saving = true;
    saveError = null;
    // Issue #379 / ADR-0021 (klidné amendment): persist every region as positive evidence. A
    // region the mother never bumped is klidné (level 0), not unknown.
    // Saving witnesses "I checked all nine" — absent ≡ unchecked, which we
    // never want to write.
    const regions: SkinRegionRecord[] = REGION_IDS.map((id) => ({
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

  function handleBack(): void {
    goto(returnTo);
  }
</script>

<div class="page-container pb-28">
  <!--
    Sticky header — matches /meal verbatim: large variant, date on the
    right, no bottom border (the sticky container owns chrome).
  -->
  <div class="sticky top-0 bg-surface z-20">
    <PageHeader title={commonStrings.skin.heading} variant="large" onBack={handleBack} bordered={false}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(date)}</p>
      {/snippet}
    </PageHeader>
  </div>

  <div class="px-4 pt-4 space-y-5">

    <!--
      Region grid section: eyebrow + tap-hint on the right. The hint
      teaches the tap-cycle interaction on first use (the gesture is
      unique to /skin and not discoverable on its own).
    -->
    <section>
      <div class="flex items-end justify-between mb-2">
        <p class="eyebrow">{commonStrings.skin.eyebrow}</p>
        <span class="caption">{commonStrings.skin.tapHint}</span>
      </div>
      <div class="grid grid-cols-3 gap-2" data-testid="skin-region-grid">
        {#each REGION_IDS as id (id)}
          {@const isActive = active === id}
          {@const lvl = levels[id]}
          {@const cfg = severityConfig[lvl]}
          {@const borderClass = isActive ? 'border-primary' : cfg.tileBorder}
          <!--
            Active uses `border-2 border-primary` (single 2px wine line).
            Inactive tiles use 1px border. The earlier "double line"
            problem came from combining `border-2` with a `ring-2` +
            ring-offset — dropping the ring lets the thicker border
            stand on its own.
          -->
          <button
            type="button"
            data-testid="skin-region-{id}"
            data-region={id}
            data-active={isActive ? 'true' : 'false'}
            data-level={lvl}
            aria-pressed={isActive}
            onclick={() => tapRegion(id)}
            class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-1 transition-all {isActive ? 'border-2' : 'border'} {borderClass} {cfg.tileBg}"
          >
            <span class="w-4 h-4 rounded-full {cfg.dot}"></span>
            <span class="text-[11px] font-medium text-text text-center leading-tight">{regionStrings[id].label}</span>
            <span class="text-[9px] text-text-muted">{severityStrings[lvl].label}</span>
          </button>
        {/each}
      </div>
    </section>

    <!--
      Photo section. The wine-tinted "Přidat fotku <region>" button only
      appears when a region is active — when none is active a grey
      disabled hint takes its place (no test anchor on the hint, so
      `queryByTestId('skin-add-photo')` returns null per the spec).
    -->
    <section>
      <p class="eyebrow mb-2">Fotky</p>
      {#if active}
        <label
          data-testid="skin-add-photo"
          class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold text-sm cursor-pointer transition-colors hover:bg-primary/15"
        >
          <span>+ Přidat fotku {regionStrings[active].label}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            class="sr-only"
            onchange={handleFileInput}
          />
        </label>
      {:else}
        <div
          class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-dark text-text-muted text-sm cursor-default"
          aria-disabled="true"
        >
          <span>+ Vyber oblast pro fotku</span>
        </div>
      {/if}

      {#if stagedPhotos.length > 0}
        <div class="mt-3">
          <SkinPhotoGallery photos={stagedPhotos} onDelete={deletePhoto} />
        </div>
      {/if}
    </section>

    <!-- Notes section: matches /meal's eyebrow + textarea pattern. -->
    <section>
      <label class="eyebrow block mb-2" for="skin-note-textarea">Poznámka</label>
      <textarea
        id="skin-note-textarea"
        bind:value={note}
        placeholder={commonStrings.skin.notePlaceholder}
        rows={2}
        class="input-base w-full px-4 py-2.5 bg-white resize-none"
        data-testid="skin-note"
      ></textarea>
    </section>
  </div>
</div>

<!-- Sticky CTA — identical to /meal. -->
<div
  class="fixed left-0 right-0 bottom-0 z-30 px-4 pt-2 bg-gradient-to-t from-surface via-surface to-transparent"
  style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
>
  <div class="max-w-lg mx-auto">
    <button
      type="button"
      data-testid="skin-save"
      aria-label={commonStrings.skin.saveAriaLabel}
      disabled={!canSave || saving}
      onclick={handleSave}
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {canSave ? 'bg-primary text-white' : 'bg-surface-dark text-text-muted cursor-default'}"
    >
      {commonStrings.skin.saveLabel}
    </button>
  </div>
</div>

{#if saveError}
  <Toast
    message={saveError}
    type="error"
    onClose={() => (saveError = null)}
  />
{/if}
